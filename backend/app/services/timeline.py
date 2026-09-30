"""Video timeline shared by the Remotion renderer and the MoviePy fallback."""
from dataclasses import dataclass
from pathlib import Path

from .. import config

# Mirrors video-renderer/src/timeline.ts so the backend can enforce the 5-minute limit before rendering.
INTRO_SECONDS = 3.5
OUTRO_SECONDS = 6.0
SCENE_OVERHEAD_SECONDS = 0.6 + 0.5  # lead-in + tail (the transition overlap cancels out)
BEAT_GAP_SECONDS = 0.25

# Veo only produces clips of these lengths; the renderer slows a clip down (to 0.5x) to cover a longer beat.
CLIP_LENGTHS = (4, 6, 8)
WORDS_PER_SECOND = 2.5


def clip_length_for(narration: str) -> int:
    """Pick the shortest Veo clip that covers the beat, estimated from its word count."""
    needed = len(narration.split()) / WORDS_PER_SECOND + BEAT_GAP_SECONDS
    return next((n for n in CLIP_LENGTHS if n >= needed), CLIP_LENGTHS[-1])


@dataclass
class Clip:
    path: Path
    seconds: float


@dataclass
class VoicedBeat:
    narration: str
    bullet: str
    audio: Path
    duration: float
    clip: Clip | None = None


@dataclass
class VoicedScene:
    title: str
    image: Path | None
    beats: list[VoicedBeat]

    @property
    def seconds(self) -> float:
        return SCENE_OVERHEAD_SECONDS + sum(b.duration + BEAT_GAP_SECONDS for b in self.beats)


def fit_to_budget(scenes: list[VoicedScene], budget: float = config.MAX_VIDEO_SECONDS) -> list[VoicedScene]:
    """Drop scenes from the end of the middle until the video fits. Keeps the intro and recap scenes."""
    kept = list(scenes)
    available = budget - INTRO_SECONDS - OUTRO_SECONDS
    while sum(s.seconds for s in kept) > available and len(kept) > 2:
        kept.pop(-2)
    return kept
