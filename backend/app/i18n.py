"""Fixed UI labels rendered by our templates (the LLM writes everything else in the document's language)."""

LABELS = {
    "en": {
        "course": "Training course", "lesson": "Lesson", "recap": "Recap", "takeaway": "Remember this",
        "cheat_sheet": "Training cheat sheet", "numbers": "In numbers", "concepts": "Key ideas",
        "steps": "Step by step", "do": "Do", "avoid": "Avoid", "quiz": "Quick check", "answer": "Answer",
        "source": "Based on",
    },
    "vi": {
        "course": "Khoá đào tạo", "lesson": "Bài", "recap": "Tóm tắt", "takeaway": "Ghi nhớ",
        "cheat_sheet": "Cẩm nang đào tạo", "numbers": "Con số đáng chú ý", "concepts": "Ý chính",
        "steps": "Các bước thực hiện", "do": "Nên làm", "avoid": "Cần tránh", "quiz": "Kiểm tra nhanh",
        "answer": "Đáp án", "source": "Dựa trên",
    },
    "id": {
        "course": "Kursus pelatihan", "lesson": "Pelajaran", "recap": "Ringkasan", "takeaway": "Ingat ini",
        "cheat_sheet": "Lembar ringkasan pelatihan", "numbers": "Dalam angka", "concepts": "Ide utama",
        "steps": "Langkah demi langkah", "do": "Lakukan", "avoid": "Hindari", "quiz": "Cek cepat",
        "answer": "Jawaban", "source": "Berdasarkan",
    },
}


def labels_for(language: str) -> dict[str, str]:
    return LABELS.get(language.split("-")[0].lower(), LABELS["en"])
