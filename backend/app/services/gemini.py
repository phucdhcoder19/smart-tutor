"""Thin wrapper around the Gemini API: structured text, image, speech, music and video generation."""
import io
import logging
import random
import re
import threading
import time
import wave
from collections.abc import Callable
from typing import TypeVar

from google import genai
from google.genai import errors, types

from .. import config
from ..schemas import TrainingContent

log = logging.getLogger(__name__)

_client = genai.Client(api_key=config.GEMINI_API_KEY)

RETRYABLE_CODES = {429, 500, 502, 503, 504}
# How long a model whose daily quota ran out is skipped before we try it again.
EXHAUSTED_COOLDOWN_SECONDS = 3600

T = TypeVar("T")


class QuotaExhausted(RuntimeError):
    """Every model in a pool has used up its daily quota, or the account is out of credits."""


def is_daily_quota_error(exc: errors.APIError) -> bool:
    return exc.code == 429 and "per_day" in str(exc)


def is_out_of_credits(exc: errors.APIError) -> bool:
    return exc.code == 402

SYSTEM_PROMPT = f"""You are an expert instructional designer.
You turn a source document into a short training course: a narrated video lesson and a one-page infographic.

Rules:
- Teach ONLY what the document says. Never invent facts, numbers, names or quotes.
- Write every learner-facing field (titles, bullets, narration, recap, infographic text) in the SAME language as the document.
- shot, opening_shot, footage_query, opening_query, image_prompt and music_mood are always in English.
- Infographic icons must be chosen from the allowed list; pick the one whose meaning fits best.
- The video has 5-7 scenes: a hook/intro, the core concepts in a logical teaching order, and a recap.
- Each scene is split into 2-4 beats. A beat is what the narrator says while one on-screen bullet appears,
  so the bullet must summarize exactly what that beat's narration says.
- Narration is spoken aloud: plain sentences, no markdown, no lists, no emojis, no URLs.
  Beats of a scene must flow naturally when read one after another.
- The TOTAL narration across all scenes must stay under {config.MAX_NARRATION_WORDS} words (the video must be under 5 minutes).
- Shots are live-action B-roll for a corporate training video: realistic people, real workplaces, natural light,
  one clear action and one camera move per shot (dolly-in, pan, tracking, handheld). Keep the cast and setting
  consistent across shots when the topic allows. Never ask for readable text, logos or on-screen UI.
- Image prompts describe a realistic photo in the same visual style as the shots, with no text.
"""


def _with_retry(fn, *, attempts: int = 4, delay: Callable[[int], float] = lambda attempt: 2**attempt):
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except errors.APIError as exc:
            # A spent daily quota won't come back in a few seconds: fail fast so a fallback can take over.
            if exc.code not in RETRYABLE_CODES or is_daily_quota_error(exc) or attempt == attempts:
                raise
            wait = delay(attempt) + random.random()
            log.warning("Gemini error %s, retrying in %.1fs", exc.code, wait)
            time.sleep(wait)


class ModelPool:
    """Try equivalent models in order, skipping any whose daily quota is spent (for an hour)."""

    def __init__(self, kind: str, models: list[str]) -> None:
        self._kind = kind
        self._models = models
        self._exhausted_at: dict[str, float] = {}
        self._lock = threading.Lock()

    def run(self, call: Callable[[str], T]) -> T:
        for model in self._models:
            if self._is_exhausted(model):
                continue
            try:
                return _with_retry(lambda: call(model))
            except errors.APIError as exc:
                if is_out_of_credits(exc):
                    raise QuotaExhausted("The Gemini account is out of prepaid credits.") from exc
                if exc.code != 429:
                    raise
                if is_daily_quota_error(exc):
                    log.warning("%s model %s hit its daily quota, trying the next one", self._kind, model)
                    with self._lock:
                        self._exhausted_at[model] = time.monotonic()
                else:
                    # Per-minute limit: the next model is usually free right now, so don't wait.
                    log.warning("%s model %s is rate-limited, trying the next one", self._kind, model)
        raise QuotaExhausted(f"All {self._kind} models are rate-limited or out of quota.")

    def _is_exhausted(self, model: str) -> bool:
        with self._lock:
            since = self._exhausted_at.get(model)
        return since is not None and time.monotonic() - since < EXHAUSTED_COOLDOWN_SECONDS


_image_models = ModelPool("image", config.IMAGE_MODELS)
_tts_models = ModelPool("speech", config.TTS_MODELS)


def generate_training_content(document_parts: list[types.Part]) -> TrainingContent:
    def call():
        return _client.models.generate_content(
            model=config.TEXT_MODEL,
            contents=[*document_parts, "Create the training course for this document."],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=TrainingContent,
                temperature=0.6,
            ),
        )

    response = _with_retry(call)
    if response.parsed is None:
        raise RuntimeError("Gemini did not return a valid course structure.")
    return response.parsed


def generate_image(prompt: str, aspect_ratio: str = "16:9") -> bytes:
    def call(model: str):
        return _client.models.generate_content(
            model=model,
            contents=f"{prompt}\nStyle: realistic cinematic photo, natural light, shallow depth of field. Absolutely no text.",
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
            ),
        )

    response = _image_models.run(call)
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise RuntimeError("Gemini returned no image.")


def _pcm_to_wav(pcm: bytes, rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm)
    return buf.getvalue()


def synthesize_speech(text: str) -> bytes:
    """Return WAV bytes for the given narration. Raises QuotaExhausted when every TTS model is spent."""
    def call(model: str):
        return _client.models.generate_content(
            model=model,
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=config.TTS_VOICE)
                    )
                ),
            ),
        )

    response = _tts_models.run(call)
    blob = response.candidates[0].content.parts[0].inline_data
    if not blob or not blob.data:
        raise RuntimeError("Gemini returned no audio.")
    # Newer TTS models return WAV; older ones return raw 16-bit PCM ("audio/L16;rate=24000").
    if blob.data[:4] == b"RIFF":
        return blob.data
    rate = re.search(r"rate=(\d+)", blob.mime_type or "")
    return _pcm_to_wav(blob.data, int(rate.group(1)) if rate else 24000)


def generate_music(mood: str) -> bytes:
    """Return a ~30s instrumental MP3 clip (looped under the narration by the renderer)."""
    def call():
        return _client.models.generate_content(
            model=config.MUSIC_MODEL,
            contents=f"{mood}. Soft instrumental background music for an e-learning video, steady and unobtrusive, no vocals.",
        )

    response = _with_retry(call)
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise RuntimeError("Gemini returned no music.")


def generate_clip(prompt: str, seconds: int, quota_retries: int = 12) -> bytes:
    """Generate a B-roll clip with Veo (a long-running operation) and return the MP4 bytes."""
    def start():
        return _client.models.generate_videos(
            model=config.VIDEO_MODEL,
            prompt=f"{prompt}. Realistic, cinematic, smooth motion. No text, no subtitles, no logos.",
            config=types.GenerateVideosConfig(aspect_ratio="16:9", resolution="720p", duration_seconds=seconds),
        )

    # Veo's quota is tight; callers with a fallback pass a small quota_retries instead of waiting it out.
    operation = _with_retry(start, attempts=quota_retries, delay=lambda attempt: 15 + 5 * min(attempt, 4))
    deadline = time.monotonic() + config.CLIP_TIMEOUT_SECONDS
    while not operation.done:
        if time.monotonic() > deadline:
            raise TimeoutError("Video clip generation timed out.")
        time.sleep(5)
        operation = _with_retry(lambda: _client.operations.get(operation))

    if operation.error:
        raise RuntimeError(f"Veo failed: {operation.error}")
    videos = operation.response.generated_videos if operation.response else None
    if not videos:
        raise RuntimeError("Veo returned no video (possibly filtered by safety checks).")
    return _client.files.download(file=videos[0].video)
