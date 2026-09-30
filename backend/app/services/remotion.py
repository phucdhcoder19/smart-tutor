"""Render the animated training video with the Remotion project in video-renderer/."""
import json
import logging
import subprocess
from collections import deque
from collections.abc import Callable
from pathlib import Path

from .. import config
from ..i18n import labels_for
from ..schemas import TrainingContent
from .timeline import Clip, VoicedScene

log = logging.getLogger(__name__)


class RenderError(RuntimeError):
    pass


def _name(path: Path | None) -> str | None:
    """All assets live in one directory served to the renderer, so props carry bare file names."""
    return path.name if path else None


def _clip(clip: Clip | None) -> dict | None:
    return {"src": clip.path.name, "seconds": clip.seconds} if clip else None


def build_props(
    content: TrainingContent,
    scenes: list[VoicedScene],
    opening_clip: Clip | None,
    music: Path | None,
) -> dict:
    labels = labels_for(content.language)
    return {
        "courseTitle": content.title,
        "subtitle": content.infographic.subtitle,
        "takeaway": content.infographic.takeaway,
        "recap": content.recap[:4],
        "openingClip": _clip(opening_clip),
        "music": _name(music),
        "labels": {"course": labels["course"], "lesson": labels["lesson"], "recap": labels["recap"], "takeaway": labels["takeaway"]},
        "scenes": [
            {
                "title": s.title,
                "image": _name(s.image),
                "beats": [
                    {
                        "text": b.narration,
                        "bullet": b.bullet or None,
                        "audio": b.audio.name,
                        "durationSec": round(b.duration, 3),
                        "clip": _clip(b.clip),
                    }
                    for b in s.beats
                ],
            }
            for s in scenes
        ],
    }


def render_video(props: dict, assets_dir: Path, output: Path, on_progress: Callable[[float], None]) -> float:
    """Render the MP4 and return its duration in seconds."""
    assets_dir, output = assets_dir.resolve(), output.resolve()  # node runs from the renderer directory
    props_path = assets_dir / "props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")

    cmd = [config.NODE_BINARY, "render.mjs", str(props_path), str(assets_dir), str(output)]
    # stderr is merged into stdout so a chatty renderer can never block on a full pipe.
    proc = subprocess.Popen(
        cmd,
        cwd=config.VIDEO_RENDERER_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    log_tail = deque(maxlen=40)
    duration = 0.0
    try:
        for line in proc.stdout:
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                log_tail.append(line.rstrip())
                continue
            if not isinstance(message, dict):
                continue
            if "progress" in message:
                on_progress(message["progress"])
            if message.get("done"):
                duration = message["durationInFrames"] / message["fps"]
        proc.wait(timeout=config.RENDER_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise RenderError("Video rendering timed out.")

    if proc.returncode != 0 or not output.exists():
        log.error("Remotion render failed:\n%s", "\n".join(log_tail))
        raise RenderError(f"Remotion exited with code {proc.returncode}")
    return duration
