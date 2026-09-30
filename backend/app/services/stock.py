"""Real stock media from the Pexels API (free, royalty-free): B-roll videos and infographic photos."""
import logging
import threading

import httpx

from .. import config

log = logging.getLogger(__name__)

VIDEO_SEARCH_URL = "https://api.pexels.com/videos/search"
PHOTO_SEARCH_URL = "https://api.pexels.com/v1/search"
TARGET_VIDEO_WIDTH = 1280  # matches the 720p render; bigger files only slow the download
RESULTS_PER_QUERY = 15

# Pexels pre-crops every photo; these renditions match the infographic's hero and arch frames.
PHOTO_RENDITION = {"landscape": "landscape", "portrait": "portrait"}


class StockFootageError(RuntimeError):
    pass


class StockLibrary:
    """Searches Pexels and hands out each video/photo at most once per course, so nothing repeats."""

    def __init__(self) -> None:
        self._used: set[tuple[str, int]] = set()
        self._lock = threading.Lock()
        self._http = httpx.Client(headers={"Authorization": config.PEXELS_API_KEY}, timeout=30, follow_redirects=True)

    def fetch_video(self, query: str, min_seconds: float) -> tuple[bytes, float]:
        """Return (mp4 bytes, duration) of the best unused landscape clip for the query."""
        videos = self._search(VIDEO_SEARCH_URL, query, "landscape").get("videos", [])
        # Prefer clips long enough to cover the beat without slowing them down.
        for video in sorted(videos, key=lambda v: v["duration"] < min_seconds):
            file = _pick_video_file(video)
            if file and self._claim("video", video["id"]):
                return self._http.get(file["link"]).content, float(video["duration"])
        raise StockFootageError(f"No unused stock footage for '{query}'.")

    def fetch_photo(self, query: str, orientation: str) -> bytes:
        """Return JPEG bytes of the first unused photo for the query, cropped to the orientation."""
        for photo in self._search(PHOTO_SEARCH_URL, query, orientation).get("photos", []):
            if self._claim("photo", photo["id"]):
                return self._http.get(photo["src"][PHOTO_RENDITION[orientation]]).content
        raise StockFootageError(f"No unused stock photo for '{query}'.")

    def _search(self, url: str, query: str, orientation: str) -> dict:
        if not config.PEXELS_API_KEY:
            raise StockFootageError("PEXELS_API_KEY is not configured.")
        response = self._http.get(
            url, params={"query": query, "orientation": orientation, "size": "medium", "per_page": RESULTS_PER_QUERY}
        )
        response.raise_for_status()
        return response.json()

    def _claim(self, kind: str, media_id: int) -> bool:
        with self._lock:
            if (kind, media_id) in self._used:
                return False
            self._used.add((kind, media_id))
            return True

    def close(self) -> None:
        self._http.close()


def _pick_video_file(video: dict) -> dict | None:
    """The smallest MP4 rendition that is at least 720p wide, else the largest available."""
    files = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("width")]
    if not files:
        return None
    hd = [f for f in files if f["width"] >= TARGET_VIDEO_WIDTH]
    return min(hd, key=lambda f: f["width"]) if hd else max(files, key=lambda f: f["width"])
