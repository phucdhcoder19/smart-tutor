"""Fallback video: static slides + narration assembled with MoviePy.

Used only when the Remotion renderer fails, so the user always gets a video."""
from pathlib import Path

from moviepy import AudioFileClip, ImageClip, concatenate_videoclips

from .. import config
from .audio import concat_wavs
from .timeline import BEAT_GAP_SECONDS, VoicedScene
from .renderer import render_slides

PAUSE_SECONDS = 0.6  # breathing room between scenes


def render_slideshow(course_title: str, scenes: list[VoicedScene], work_dir: Path, out_path: Path) -> float:
    slides = render_slides(
        course_title,
        [(s.title, [b.bullet for b in s.beats if b.bullet], s.image) for s in scenes],
        work_dir / "slides",
    )
    audios = [
        concat_wavs([b.audio for b in s.beats], work_dir / f"scene_{i}.wav", BEAT_GAP_SECONDS)
        for i, s in enumerate(scenes)
    ]

    clips = []
    for slide, audio_path in zip(slides, audios):
        audio = AudioFileClip(str(audio_path))
        clips.append(ImageClip(str(slide)).with_duration(audio.duration + PAUSE_SECONDS).with_audio(audio))

    final = concatenate_videoclips(clips, method="chain")
    try:
        final.write_videofile(
            str(out_path),
            fps=config.VIDEO_FPS,
            codec="libx264",
            audio_codec="aac",
            preset="veryfast",
            threads=4,
            ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],  # plays on every phone
            logger=None,
        )
        return final.duration
    finally:
        final.close()
        for clip in clips:
            clip.close()
