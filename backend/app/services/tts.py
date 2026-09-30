"""Narration: Gemini TTS first; free Microsoft Edge neural voices once Gemini's daily quota is spent."""
import asyncio
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import imageio_ffmpeg

from . import gemini

log = logging.getLogger(__name__)

# Native voices first; the multilingual voice reads most languages and is the last resort
# (some locale voices intermittently return no audio).
MULTILINGUAL_VOICE = "en-US-AvaMultilingualNeural"
EDGE_VOICES = {
    "en": ["en-US-AvaMultilingualNeural"],
    "vi": ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural", MULTILINGUAL_VOICE],
    "id": ["id-ID-GadisNeural", "id-ID-ArdiNeural", MULTILINGUAL_VOICE],
}


@dataclass
class Speech:
    data: bytes  # 24 kHz mono 16-bit WAV
    engine: str  # "gemini" | "edge"


def synthesize(text: str, language: str) -> Speech:
    try:
        return Speech(gemini.synthesize_speech(text), "gemini")
    except gemini.QuotaExhausted:
        log.warning("Gemini TTS quota spent, using Edge voice")
    except Exception:
        log.exception("Gemini TTS failed, using Edge voice")
    return synthesize_edge(text, language)


def _edge_mp3(text: str, language: str, out: Path) -> None:
    voices = EDGE_VOICES.get(language.split("-")[0].lower(), [MULTILINGUAL_VOICE])
    for voice in voices:
        try:
            asyncio.run(edge_tts.Communicate(text, voice).save(str(out)))
            return
        except edge_tts.exceptions.NoAudioReceived:
            log.warning("Edge voice %s returned no audio", voice)
    raise RuntimeError("No Edge voice could read this text.")


def synthesize_edge(text: str, language: str) -> Speech:
    with tempfile.TemporaryDirectory() as tmp:
        mp3, wav = Path(tmp) / "speech.mp3", Path(tmp) / "speech.wav"
        _edge_mp3(text, language, mp3)
        # Same format as Gemini TTS, so durations and concatenation work identically.
        subprocess.run(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", str(wav)],
            check=True,
        )
        return Speech(wav.read_bytes(), "edge")
