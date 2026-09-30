"""In-memory task registry. Good enough for a single-instance demo server;
swap for Redis/DB when scaling to multiple workers."""
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field


@dataclass
class Task:
    id: str
    filename: str
    status: str = "queued"  # queued | processing | completed | failed
    step: str = "Waiting to start"
    progress: int = 0
    title: str | None = None
    summary: str | None = None
    video_path: str | None = None
    infographic_path: str | None = None
    video_duration: float | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)


_tasks: dict[str, Task] = {}
_lock = threading.Lock()


def create_task(filename: str) -> Task:
    task = Task(id=uuid.uuid4().hex, filename=filename)
    with _lock:
        _tasks[task.id] = task
    return task


def get_task(task_id: str) -> Task | None:
    return _tasks.get(task_id)


def update_task(task_id: str, **changes) -> None:
    with _lock:
        task = _tasks[task_id]
        for key, value in changes.items():
            setattr(task, key, value)


def task_dict(task: Task) -> dict:
    return asdict(task)
