"""Turn an uploaded document into something Gemini can read.

PDFs are sent to Gemini natively (it understands layout, tables and figures).
Other formats are converted to plain text first."""
from pathlib import Path

import pymupdf
from docx import Document
from google.genai import types

MAX_TEXT_CHARS = 400_000  # ~100k tokens, well inside Gemini's context window


class DocumentError(ValueError):
    pass


def _docx_text(path: Path) -> str:
    doc = Document(str(path))
    lines = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            lines.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n".join(lines)


def load_document(path: Path) -> list[types.Part]:
    """Return the Gemini content parts representing the document."""
    ext = path.suffix.lower()

    if ext == ".pdf":
        try:
            with pymupdf.open(path) as pdf:
                if pdf.page_count == 0:
                    raise DocumentError("The PDF has no pages.")
        except pymupdf.FileDataError as exc:
            raise DocumentError("The PDF file is corrupted or encrypted.") from exc
        return [types.Part.from_bytes(data=path.read_bytes(), mime_type="application/pdf")]

    if ext == ".docx":
        text = _docx_text(path)
    elif ext in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8", errors="replace")
    else:
        raise DocumentError(f"Unsupported file type: {ext}")

    text = text.strip()
    if len(text) < 50:
        raise DocumentError("The document does not contain enough text to build a lesson.")
    return [types.Part.from_text(text=f"DOCUMENT:\n{text[:MAX_TEXT_CHARS]}")]
