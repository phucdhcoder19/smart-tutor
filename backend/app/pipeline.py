"""End-to-end generation pipeline.

document -> course plan (1 Gemini call) -> media assets in parallel -> infographic PNG + animated MP4
"""
import logging
import shutil
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

from google.genai import errors

from . import config
from .schemas import Beat, TrainingContent
from .services import gemini, remotion, renderer, tts, video
from .services.audio import wav_duration
from .services.document import DocumentError, load_document
from .services.footage import Footage, FootageDirector
from .services.stock import StockLibrary
from .services.tts import Speech
from .services.timeline import Clip, VoicedBeat, VoicedScene, clip_length_for, fit_to_budget
from .tasks import get_task, update_task

log = logging.getLogger(__name__)

ProgressFn = Callable[[int, str], None]


@dataclass
class Assets:
    music: Path | None = None
    opening_clip: Clip | None = None
    scene_images: dict[int, Path] = field(default_factory=dict)
    beat_audio: dict[tuple[int, int], Path] = field(default_factory=dict)
    beat_clips: dict[tuple[int, int], Clip] = field(default_factory=dict)
    beat_voice_engine: dict[tuple[int, int], str] = field(default_factory=dict)
    infographic_photos: dict[str, Path] = field(default_factory=dict)


@dataclass
class Job:
    key: tuple
    make: Callable[[], bytes | Footage | Speech]
    path: Path

    @property
    def is_footage(self) -> bool:
        """Slow network-bound media (stock downloads, Veo renders) that gets its own pool."""
        return self.key[0] in ("opening", "clip", "photo")

    def store(self, result: bytes | Footage | Speech, assets: Assets) -> None:
        self.path.write_bytes(result if isinstance(result, bytes) else result.data)
        match self.key:
            case ("music",):
                assets.music = self.path
            case ("opening",):
                assets.opening_clip = Clip(self.path, result.seconds)
            case ("image", s):
                assets.scene_images[s] = self.path
            case ("audio", s, b):
                assets.beat_audio[(s, b)] = self.path
                assets.beat_voice_engine[(s, b)] = result.engine
            case ("clip", s, b):
                assets.beat_clips[(s, b)] = Clip(self.path, result.seconds)
            case ("photo", slot):
                assets.infographic_photos[slot] = self.path


def clip_priority(content: TrainingContent) -> list[tuple[int, int, Beat]]:
    """Order beats so a limited clip budget is spread across scenes: every scene's first beat,
    then every scene's second beat, and so on. Beats left without a clip reuse one from their scene."""
    return sorted(content.beats(), key=lambda item: (item[1], item[0]))


def plan_jobs(content: TrainingContent, work_dir: Path, director: FootageDirector, stock: StockLibrary) -> list[Job]:
    """Every asset the course needs. Footage jobs come in priority order (opening shot first),
    which is also the order the director spends its small Veo budget in."""
    jobs = [
        Job(("opening",), lambda: director.shoot(content.opening_shot, content.opening_query, 4), work_dir / "opening.mp4"),
    ]
    info = content.infographic
    jobs.append(Job(("photo", "hero"), lambda: stock.fetch_photo(info.hero_photo_query, "landscape"), work_dir / "photo_hero.jpg"))
    for i, concept in enumerate(info.concepts):
        jobs.append(
            Job(("photo", f"concept_{i}"), lambda q=concept.photo_query: stock.fetch_photo(q, "portrait"), work_dir / f"photo_concept_{i}.jpg")
        )
    if config.GENERATE_MUSIC:
        jobs.append(Job(("music",), lambda: gemini.generate_music(content.music_mood), work_dir / "music.mp3"))
    for s, b, beat in clip_priority(content)[: config.MAX_FOOTAGE_CLIPS]:
        seconds = clip_length_for(beat.narration)
        jobs.append(
            Job(("clip", s, b), lambda bt=beat, n=seconds: director.shoot(bt.shot, bt.footage_query, n), work_dir / f"clip_{s}_{b}.mp4")
        )
    if config.GENERATE_SCENE_IMAGES:
        for s, scene in enumerate(content.scenes):
            jobs.append(Job(("image", s), lambda p=scene.image_prompt: gemini.generate_image(p, "16:9"), work_dir / f"scene_{s}.png"))
    for s, b, beat in content.beats():
        jobs.append(
            Job(("audio", s, b), lambda t=beat.narration: tts.synthesize(t, content.language), work_dir / f"beat_{s}_{b}.wav")
        )
    return jobs


def generate_assets(content: TrainingContent, work_dir: Path, progress: ProgressFn) -> Assets:
    """Generate every image, narration, music track and footage clip in parallel.

    Failures are tolerated per asset: a missing clip falls back to the scene photo, a missing
    photo becomes a gradient, a missing narration drops that beat, missing music means voice only."""
    stock = StockLibrary()
    director = FootageDirector(stock)
    jobs = plan_jobs(content, work_dir, director, stock)
    assets = Assets()

    # Footage is slow (downloads, or ~40s Veo renders), so it gets its own pool and never blocks speech/images.
    with (
        ThreadPoolExecutor(max_workers=config.MAX_PARALLEL_CALLS) as media_pool,
        ThreadPoolExecutor(max_workers=config.MAX_PARALLEL_CLIPS) as footage_pool,
    ):
        futures = {(footage_pool if job.is_footage else media_pool).submit(job.make): job for job in jobs}
        for done, future in enumerate(as_completed(futures), start=1):
            job = futures[future]
            try:
                job.store(future.result(), assets)
            except Exception:
                log.exception("Asset %s failed", job.key)
            progress(12 + int(50 * done / len(jobs)), f"Finding footage, recording voiceover and music ({done}/{len(jobs)})")
    stock.close()
    unify_voice(content, assets)
    return assets


def unify_voice(content: TrainingContent, assets: Assets) -> None:
    """If Gemini's TTS quota ran out mid-course, re-voice the Gemini beats with Edge so one narrator reads it all."""
    engines = set(assets.beat_voice_engine.values())
    if len(engines) < 2:
        return
    log.warning("Mixed narration voices; re-recording the whole course with the Edge voice")
    beats = {(s, b): beat for s, b, beat in content.beats()}
    redo = [key for key, engine in assets.beat_voice_engine.items() if engine != "edge"]
    with ThreadPoolExecutor(max_workers=config.MAX_PARALLEL_CALLS) as pool:
        for key, speech in zip(redo, pool.map(lambda k: tts.synthesize_edge(beats[k].narration, content.language), redo)):
            assets.beat_audio[key].write_bytes(speech.data)
            assets.beat_voice_engine[key] = speech.engine


def voice_scenes(content: TrainingContent, assets: Assets) -> list[VoicedScene]:
    """Pair each beat with its narration clip; drop beats (and scenes) that have no audio."""
    scenes = []
    for s, scene in enumerate(content.scenes):
        beats = [
            VoicedBeat(beat.narration, beat.bullet, audio, wav_duration(audio), assets.beat_clips.get((s, b)))
            for b, beat in enumerate(scene.beats)
            if (audio := assets.beat_audio.get((s, b)))
        ]
        if beats:
            scenes.append(VoicedScene(scene.title, assets.scene_images.get(s), beats))
    if not scenes:
        raise RuntimeError("Voiceover generation failed for every scene.")
    return fit_to_budget(scenes)


def render_training_video(
    content: TrainingContent, scenes: list[VoicedScene], assets: Assets, work_dir: Path, out: Path, progress: ProgressFn
) -> float:
    """Animated Remotion render, falling back to a MoviePy slideshow so the user always gets a video."""
    try:
        props = remotion.build_props(content, scenes, assets.opening_clip, assets.music)
        return remotion.render_video(
            props, work_dir, out, lambda p: progress(65 + int(33 * p), f"Animating training video ({int(p * 100)}%)")
        )
    except Exception:
        log.exception("Remotion render failed, falling back to slideshow")
        progress(70, "Rendering training video (simple mode)")
        return video.render_slideshow(content.title, scenes, work_dir, out)


def run_pipeline(task_id: str, source_path: Path) -> None:
    task_dir = source_path.parent
    work_dir = task_dir / "work"
    work_dir.mkdir(exist_ok=True)

    def progress(pct: int, step: str) -> None:
        log.info("[%s] %d%% %s", task_id[:8], pct, step)
        update_task(task_id, status="processing", progress=pct, step=step)

    try:
        source_name = get_task(task_id).filename
        progress(5, "Reading document")
        parts = load_document(source_path)

        progress(8, "AI is analyzing the document and writing the lesson")
        content = gemini.generate_training_content(parts)
        update_task(task_id, title=content.title, summary=content.summary)

        assets = generate_assets(content, work_dir, progress)
        scenes = voice_scenes(content, assets)

        progress(62, "Designing infographic")
        infographic_path = task_dir / "infographic.png"
        renderer.render_infographic(content, source_name, assets.infographic_photos, infographic_path)

        progress(65, "Animating training video")
        video_path = task_dir / "video.mp4"
        duration = render_training_video(content, scenes, assets, work_dir, video_path, progress)

        update_task(
            task_id,
            status="completed",
            progress=100,
            step="Done",
            video_path=str(video_path.relative_to(config.OUTPUT_DIR)),
            infographic_path=str(infographic_path.relative_to(config.OUTPUT_DIR)),
            video_duration=round(duration, 1),
        )
        shutil.rmtree(work_dir, ignore_errors=True)

    except DocumentError as exc:
        update_task(task_id, status="failed", step="Failed", error=str(exc))
    except errors.APIError as exc:
        log.exception("[%s] AI provider error", task_id[:8])
        reason = "the AI provider account is out of credits" if gemini.is_out_of_credits(exc) else f"AI provider error {exc.code}"
        update_task(task_id, status="failed", step="Failed", error=f"Generation failed: {reason}.")
    except Exception as exc:
        log.exception("[%s] pipeline failed", task_id[:8])
        update_task(task_id, status="failed", step="Failed", error=f"Generation failed: {exc}")
