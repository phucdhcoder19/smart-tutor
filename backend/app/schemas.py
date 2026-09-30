from typing import Literal

from pydantic import BaseModel, Field


class Beat(BaseModel):
    narration: str = Field(description="1-2 spoken sentences, max 30 words, conversational teaching tone")
    bullet: str = Field(description="Short on-screen point for this beat, max 8 words. Empty string if the beat only adds context.")
    footage_query: str = Field(
        description="2-4 English keywords to find a matching stock video for this beat, concrete and visual, "
        "e.g. 'call center agent headset' or 'hands typing laptop'"
    )
    shot: str = Field(
        description="English prompt for a realistic, cinematic 4-8 second video shot showing this beat: "
        "who is on screen, what they do, the setting, lighting and one camera movement. No text or screens with readable text."
    )


class Scene(BaseModel):
    title: str = Field(description="Short on-screen heading for this scene, max 6 words")
    beats: list[Beat] = Field(description="2-4 beats in speaking order. Each non-empty bullet appears on screen when its beat is spoken.")
    image_prompt: str = Field(description="English description of a realistic photo for this scene (used if video generation fails). No text in the image.")


# Icons the infographic can show (files in app/templates/icons). The model must pick from this list.
ConceptIcon = Literal[
    "shield-check", "lock", "key-round", "mail-warning", "phone", "message-circle", "users", "user-check",
    "headphones", "clock", "timer", "calendar-check", "target", "trending-up", "chart-column", "lightbulb",
    "brain", "book-open", "graduation-cap", "circle-check", "triangle-alert", "cloud", "server", "database",
    "cpu", "code", "globe", "wifi", "smartphone", "laptop", "settings", "wrench", "rocket", "handshake",
    "heart-handshake", "thumbs-up", "star", "award", "flag", "list-checks", "search", "eye", "ear", "megaphone",
    "dollar-sign", "piggy-bank", "leaf", "heart-pulse", "scale", "file-text", "zap", "recycle", "puzzle",
]


class KeyStat(BaseModel):
    value: str = Field(description="A striking number from the document, e.g. '72%' or '3x'. Max 6 characters.")
    label: str = Field(description="What the number means, max 8 words")


class Concept(BaseModel):
    heading: str = Field(description="Name of the key idea, max 5 words")
    icon: ConceptIcon = Field(description="The icon that best represents this idea")
    photo_query: str = Field(description="2-4 English keywords for a real stock photo illustrating this idea, e.g. 'team meeting whiteboard'")
    points: list[str] = Field(description="2-3 concise points, max 14 words each")


class Step(BaseModel):
    title: str = Field(description="Action to take, max 5 words, starting with a verb")
    detail: str = Field(description="How or why, max 14 words")


class Tips(BaseModel):
    do: list[str] = Field(description="3 good practices from the document, max 10 words each")
    avoid: list[str] = Field(description="3 common mistakes to avoid, max 10 words each")


class QuizQuestion(BaseModel):
    question: str = Field(description="One question that checks the most important idea, max 20 words")
    answer: str = Field(description="The correct answer, max 20 words")


class Infographic(BaseModel):
    subtitle: str = Field(description="One line saying what the learner will be able to do, max 14 words")
    topic_icon: ConceptIcon = Field(description="The icon that best represents the whole topic")
    hero_photo_query: str = Field(description="2-4 English keywords for a wide real stock photo that opens the infographic")
    stats: list[KeyStat] = Field(description="0-3 key numbers found in the document. Empty if there are none. Never invent numbers.")
    concepts: list[Concept] = Field(description="3-4 key ideas that cover the core knowledge")
    steps: list[Step] = Field(description="3-5 steps of the main process or procedure; empty if the document has none")
    tips: Tips
    quiz: QuizQuestion
    takeaway: str = Field(description="The single most important lesson, max 22 words")


class TrainingContent(BaseModel):
    title: str = Field(description="Course title, max 8 words")
    language: str = Field(description="BCP-47 code of the document language, e.g. 'en', 'vi', 'id'")
    summary: str = Field(description="2-3 sentence summary of the document")
    scenes: list[Scene] = Field(description="5-7 scenes: intro, core concepts in logical order, recap")
    recap: list[str] = Field(description="3-4 key points for the closing recap card, max 8 words each")
    opening_query: str = Field(description="2-4 English keywords for a stock video that opens the course, e.g. 'modern office team'")
    opening_shot: str = Field(description="English prompt for a 4-second cinematic establishing shot that introduces the topic. No text.")
    music_mood: str = Field(description="English description of fitting instrumental background music, e.g. 'calm corporate piano'")
    infographic: Infographic

    def beats(self) -> list[tuple[int, int, Beat]]:
        """All beats as (scene index, beat index, beat)."""
        return [(s, b, beat) for s, scene in enumerate(self.scenes) for b, beat in enumerate(scene.beats)]
