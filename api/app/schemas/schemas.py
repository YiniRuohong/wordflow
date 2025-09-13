from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
from app.models import ImportStatus, SRSAlgorithm


class WordbookBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    language: str = Field(default="fr", max_length=10)
    author: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=20)


class WordbookCreate(WordbookBase):
    pass


class WordbookUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    author: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=20)


class WordbookResponse(WordbookBase):
    id: int
    total_words: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WordBase(BaseModel):
    lemma: str = Field(..., min_length=1, max_length=100)
    pos: Optional[str] = Field(None, max_length=20)
    gender: Optional[str] = Field(None, max_length=1)
    ipa: Optional[str] = Field(None, max_length=200)
    meaning_zh: str = Field(..., min_length=1)
    meaning_text: Optional[str] = None
    translations: Optional[Dict[str, str]] = None
    lesson: Optional[str] = Field(None, max_length=10)
    cefr: Optional[str] = Field(None, max_length=2)
    tags: Optional[str] = Field(None, max_length=500)


class WordCreate(WordBase):
    pass


class WordResponse(WordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('translations', mode='before')
    @classmethod
    def _parse_translations(cls, v):
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except Exception:
                return None
        return v


class CardBase(BaseModel):
    word_id: int
    template: str = Field(default="basic", max_length=50)
    hint: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=500)


class CardCreate(CardBase):
    pass


class CardResponse(CardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SRSStateResponse(BaseModel):
    card_id: int
    due: datetime
    interval: float
    ease: float
    reps: int
    lapses: int
    algo: SRSAlgorithm
    last_reviewed: Optional[datetime]

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    card_id: int
    grade: int = Field(..., ge=0, le=3)
    elapsed_ms: Optional[int] = Field(None, ge=0)


class ReviewResponse(BaseModel):
    id: int
    card_id: int
    ts: datetime
    grade: int
    elapsed_ms: Optional[int]

    class Config:
        from_attributes = True


class ExampleBase(BaseModel):
    card_id: int
    text_fr: str = Field(..., min_length=1)
    translation_zh: str = Field(..., min_length=1)
    source: Optional[str] = Field(None, max_length=100)
    audio_uri: Optional[str] = Field(None, max_length=500)
    cefr: Optional[str] = Field(None, max_length=2)


class ExampleCreate(ExampleBase):
    pass


class ExampleResponse(ExampleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImportCreate(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    total: int = Field(default=0, ge=0)


class ImportResponse(BaseModel):
    id: int
    filename: str
    started_at: datetime
    finished_at: Optional[datetime]
    status: ImportStatus
    total: int
    succeeded: int
    failed: int
    message: Optional[str]

    class Config:
        from_attributes = True


class ImportProgress(BaseModel):
    import_id: int
    status: ImportStatus
    total: int
    succeeded: int
    failed: int
    progress_percent: float
    message: Optional[str]


class BulkImportResponse(BaseModel):
    import_id: int
    status: str
    message: str


class WordSearchResponse(BaseModel):
    words: List[WordResponse]
    total: int
    page: int
    per_page: int


class StudySessionResponse(BaseModel):
    cards: List[dict]  # Will be defined more specifically later
    total: int
    session_id: str


# App Settings
class AppearanceSettings(BaseModel):
    theme: Literal['light', 'dark', 'auto'] = 'auto'
    language: str = 'zh-CN'
    animations: bool = True


class StudySettings(BaseModel):
    dailyNewWords: int = 10
    reviewBatchSize: int = 20
    autoPlayAudio: bool = True
    showHints: bool = True


class NotificationSettings(BaseModel):
    enabled: bool = True
    studyReminder: bool = True
    reviewReminder: bool = True
    reminderTime: str = '20:00'


class StorageSettings(BaseModel):
    cacheSize: int = 100
    autoBackup: bool = True
    backupInterval: Literal['daily', 'weekly', 'monthly'] = 'daily'


class AppSettings(BaseModel):
    appearance: AppearanceSettings = AppearanceSettings()
    study: StudySettings = StudySettings()
    notifications: NotificationSettings = NotificationSettings()
    storage: StorageSettings = StorageSettings()
