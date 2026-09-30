"""Render infographic and video slides from structured content using HTML + headless Chromium.

The LLM only produces *content*; layout lives in these templates. That keeps text
100% legible (image models misspell text) and the design consistent every run."""
import base64
from functools import lru_cache
from html import escape
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup
from playwright.sync_api import sync_playwright

from .. import config
from ..i18n import labels_for
from ..schemas import TrainingContent

FONT_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap" rel="stylesheet">'
)

BASE_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Be Vietnam Pro', 'Segoe UI', 'Noto Sans', Arial, sans-serif; color: #1b2433; }
"""

PALETTE = ["#2f6fed", "#12a58a", "#f08a24", "#8b5cf6", "#e0487a"]

def _data_uri(path: Path | None) -> str | None:
    if not path or not path.exists():
        return None
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


# ---------- Infographic ----------

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
ICONS_DIR = TEMPLATES_DIR / "icons"
_jinja = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=select_autoescape(["html"]))


@lru_cache(maxsize=None)
def icon(name: str) -> Markup:
    """Inline a Lucide SVG so it inherits `color` and needs no network at render time."""
    svg = (ICONS_DIR / f"{name}.svg").read_text(encoding="utf-8")
    return Markup(svg[svg.index("<svg"):])


def infographic_html(content: TrainingContent, source_name: str, photos: dict[str, Path]) -> str:
    """`photos` maps slots ("hero", "concept_0", ...) to stock photos; missing slots render without a photo."""
    return _jinja.get_template("infographic.html").render(
        title=content.title,
        info=content.infographic,
        labels=labels_for(content.language),
        language=content.language,
        source_name=source_name,
        icon=icon,
        photo=lambda slot: _data_uri(photos.get(slot)),
    )


# ---------- Video slides (fallback renderer only) ----------

def slide_html(course_title: str, title: str, bullets: list[str], index: int, total: int, image: Path | None) -> str:
    w, h = config.VIDEO_SIZE
    color = PALETTE[index % 5]
    img_uri = _data_uri(image)
    visual = (
        f'<img src="{img_uri}">' if img_uri
        else f'<div class="placeholder" style="background:linear-gradient(135deg,{color},#1d3f8f)"></div>'
    )
    items = "".join(f"<li>{escape(b)}</li>" for b in bullets[:4])
    progress = (index + 1) / total * 100

    return f"""<!doctype html><html><head><meta charset="utf-8">{FONT_LINK}<style>{BASE_CSS}
body {{ width: {w}px; height: {h}px; overflow: hidden; background: #fff; display: flex; }}
.panel {{ width: 44%; padding: 56px 44px; display: flex; flex-direction: column; }}
.course {{ font-size: 16px; font-weight: 600; color: #8a94a8; text-transform: uppercase; letter-spacing: 2px; }}
.badge {{ margin-top: 28px; display: inline-block; align-self: flex-start; background: {color}; color: #fff; font-weight: 800; font-size: 18px; padding: 6px 16px; border-radius: 999px; }}
h1 {{ font-size: 44px; line-height: 1.15; font-weight: 800; margin-top: 18px; }}
ul {{ margin-top: 28px; list-style: none; }}
li {{ font-size: 24px; line-height: 1.35; margin: 14px 0; padding-left: 30px; position: relative; color: #34405a; }}
li::before {{ content: ""; position: absolute; left: 0; top: 11px; width: 12px; height: 12px; border-radius: 3px; background: {color}; }}
.visual {{ width: 56%; height: 100%; }}
.visual img, .placeholder {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.bar {{ position: absolute; left: 0; bottom: 0; height: 8px; width: {progress:.1f}%; background: {color}; }}
</style></head><body>
<div class="panel">
  <div class="course">{escape(course_title)}</div>
  <div class="badge">{index + 1} / {total}</div>
  <h1>{escape(title)}</h1>
  <ul>{items}</ul>
</div>
<div class="visual">{visual}</div>
<div class="bar"></div>
</body></html>"""


# ---------- Rendering ----------

def _render(page, html: str, out: Path, full_page: bool) -> None:
    page.set_content(html, wait_until="load")
    try:
        page.wait_for_load_state("networkidle", timeout=8000)  # web font
    except Exception:
        pass  # render with fallback fonts rather than fail
    page.screenshot(path=str(out), full_page=full_page)


def _with_page(width: int, height: int, fn):
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            return fn(browser.new_page(viewport={"width": width, "height": height}))
        finally:
            browser.close()


def render_infographic(content: TrainingContent, source_name: str, photos: dict[str, Path], out: Path) -> None:
    html = infographic_html(content, source_name, photos)
    _with_page(1080, 1920, lambda page: _render(page, html, out, full_page=True))


def render_slides(course_title: str, slides: list[tuple[str, list[str], Path | None]], out_dir: Path) -> list[Path]:
    """Render one PNG per (title, bullets, image). Used by the MoviePy fallback video."""
    out_dir.mkdir(parents=True, exist_ok=True)

    def run(page):
        paths = []
        for i, (title, bullets, image) in enumerate(slides):
            out = out_dir / f"slide_{i:02d}.png"
            _render(page, slide_html(course_title, title, bullets, i, len(slides), image), out, full_page=False)
            paths.append(out)
        return paths

    w, h = config.VIDEO_SIZE
    return _with_page(w, h, run)
