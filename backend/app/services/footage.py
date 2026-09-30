"""Decide where each B-roll shot comes from: Veo (generated) for the first few, Pexels (stock) otherwise."""
import logging
import threading
from dataclasses import dataclass

from google.genai import errors

from .. import config
from . import gemini
from .stock import StockLibrary

log = logging.getLogger(__name__)


@dataclass
class Footage:
    data: bytes
    seconds: float
    source: str  # "veo" | "pexels"


class FootageDirector:
    """Hands out a small Veo budget first-come-first-served (jobs are submitted in priority order)
    and switches Veo off for the rest of the course as soon as its quota runs out."""

    def __init__(self, stock: StockLibrary, veo_budget: int = config.VEO_CLIPS_PER_VIDEO) -> None:
        self._stock = stock
        self._veo_left = veo_budget
        self._lock = threading.Lock()

    def shoot(self, shot_prompt: str, stock_query: str, seconds: int) -> Footage:
        if self._take_veo_slot():
            try:
                return Footage(gemini.generate_clip(shot_prompt, seconds, quota_retries=1), seconds, "veo")
            except errors.APIError as exc:
                if exc.code == 429:
                    self._disable_veo()
                log.warning("Veo unavailable (%s), using stock footage", exc.code)
            except Exception:
                log.exception("Veo failed, using stock footage")

        data, duration = self._stock.fetch_video(stock_query, min_seconds=seconds)
        return Footage(data, duration, "pexels")

    def _take_veo_slot(self) -> bool:
        with self._lock:
            if self._veo_left <= 0:
                return False
            self._veo_left -= 1
            return True

    def _disable_veo(self) -> None:
        with self._lock:
            if self._veo_left > 0:
                log.warning("Veo quota exhausted; remaining shots use stock footage")
            self._veo_left = 0
