"""Small WAV helpers (Gemini TTS returns 24 kHz 16-bit mono WAV)."""
import wave
from pathlib import Path


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wav:
        return wav.getnframes() / float(wav.getframerate())


def concat_wavs(paths: list[Path], out: Path, gap_seconds: float) -> Path:
    """Join same-format WAV files with a short silence between them."""
    with wave.open(str(paths[0]), "rb") as first:
        params = first.getparams()
    silence = b"\x00" * int(params.framerate * gap_seconds) * params.sampwidth * params.nchannels
    with wave.open(str(out), "wb") as dst:
        dst.setparams(params)
        for i, path in enumerate(paths):
            with wave.open(str(path), "rb") as src:
                dst.writeframes(src.readframes(src.getnframes()))
            if i < len(paths) - 1:
                dst.writeframes(silence)
    return out
