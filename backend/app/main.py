import logging
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .pipeline import run_pipeline
from .tasks import create_task, get_task

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
}

app = FastAPI(title="SmartTutor API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/outputs", StaticFiles(directory=config.OUTPUT_DIR), name="outputs")


@app.get("/api/health")
def health():
    return {"status": "ok", "gemini_key_configured": bool(config.GEMINI_API_KEY)}


@app.post("/api/upload", status_code=202)
async def upload(file: UploadFile, background_tasks: BackgroundTasks):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        # Some mobile clients drop the extension; fall back to the MIME type.
        ext = MIME_TO_EXT.get((file.content_type or "").split(";")[0], ext)
    if ext not in config.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}")

    data = await file.read()
    if not data:
        raise HTTPException(400, "The file is empty.")
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File is larger than {config.MAX_UPLOAD_MB} MB.")

    task = create_task(file.filename)
    task_dir = config.OUTPUT_DIR / task.id
    task_dir.mkdir(parents=True)
    source_path = task_dir / f"source{ext}"
    source_path.write_bytes(data)

    background_tasks.add_task(run_pipeline, task.id, source_path)
    return {"task_id": task.id, "status": task.status}


@app.get("/api/status/{task_id}")
def status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(404, "Task not found.")

    # Relative URLs: the client prefixes its own API base, which stays correct behind proxies/tunnels.
    def url(rel: str | None):
        return f"/outputs/{Path(rel).as_posix()}" if rel else None

    return {
        "task_id": task.id,
        "status": task.status,
        "step": task.step,
        "progress": task.progress,
        "title": task.title,
        "summary": task.summary,
        "video_url": url(task.video_path),
        "video_duration": task.video_duration,
        "infographic_url": url(task.infographic_path),
        "error": task.error,
    }
