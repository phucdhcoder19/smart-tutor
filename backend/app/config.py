import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _models(name: str, default: str) -> list[str]:
    return [m.strip() for m in os.getenv(name, default).split(",") if m.strip()]


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Model names verified against the key's model list (see README > AI services).
TEXT_MODEL = os.getenv("TEXT_MODEL", "gemini-3.8-flash")

# Image and speech models have small per-model daily quotas (e.g. 100 TTS requests/day),
# so each is a fallback chain: when one model's daily quota is spent we move to the next.
IMAGE_MODELS = _models("IMAGE_MODELS", "gemini-3.1-flash-image,gemini-3.1-flash-lite-image,gemini-2.5-flash-image")
TTS_MODELS = _models(
    "TTS_MODELS",
    "gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts,gemini-3.1-flash-tts-preview,"
    "gemini-2.5-flash-preview-tts,gemini-2.5-pro-preview-tts",
)
TTS_VOICE = os.getenv("TTS_VOICE", "Kore")
MUSIC_MODEL = os.getenv("MUSIC_MODEL", "lyria-3-clip-preview")
VIDEO_MODEL = os.getenv("VIDEO_MODEL", "veo-3.1-lite-generate-preview")

# B-roll footage. Stock clips (Pexels, free) cover every beat; Veo (~$0.05 per generated second,
# small daily quota on low API tiers) can film the first few shots. 0 disables Veo.
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
VEO_CLIPS_PER_VIDEO = int(os.getenv("VEO_CLIPS_PER_VIDEO", "0"))
MAX_FOOTAGE_CLIPS = int(os.getenv("MAX_FOOTAGE_CLIPS", "24"))

# Optional paid extras. Off by default to keep a video at ~$0.10: stock footage already covers
# the visuals, and scene photos are only a fallback for beats without footage.
GENERATE_SCENE_IMAGES = os.getenv("GENERATE_SCENE_IMAGES", "false").lower() == "true"
GENERATE_MUSIC = os.getenv("GENERATE_MUSIC", "false").lower() == "true"
MAX_PARALLEL_CLIPS = int(os.getenv("MAX_PARALLEL_CLIPS", "4"))
CLIP_TIMEOUT_SECONDS = 300

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", BASE_DIR / "outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_MB = 15
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

# Video length budget. Hard limit from the assignment is 5:00; keep a safety margin.
MAX_VIDEO_SECONDS = 290
# ~150 spoken words per minute -> about 4 minutes of narration.
MAX_NARRATION_WORDS = 600

# Parallel calls to Gemini for images / TTS (keeps us under per-minute rate limits).
MAX_PARALLEL_CALLS = int(os.getenv("MAX_PARALLEL_CALLS", "4"))

VIDEO_SIZE = (1280, 720)
VIDEO_FPS = 24

# Remotion project that renders the animated video (see video-renderer/).
VIDEO_RENDERER_DIR = Path(os.getenv("VIDEO_RENDERER_DIR", BASE_DIR / "video-renderer"))
NODE_BINARY = os.getenv("NODE_BINARY", "node")
RENDER_TIMEOUT_SECONDS = 900
