from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
from datetime import datetime, timezone


class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"


class SRSAlgorithm(str, enum.Enum):
    SM2 = "sm2"
    FSRS = "fsrs"


class Wordbook(Base):
    """词库表 - 管理不同的单词集合"""
    __tablename__ = "wordbooks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text)
    language = Column(String(10), default="fr")  # 语言代码 
    author = Column(String(100))
    version = Column(String(20))
    total_words = Column(Integer, default=0)
    is_active = Column(Boolean, default=False)  # 当前激活的词库
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    words = relationship("Word", back_populates="wordbook", cascade="all, delete-orphan")
    imports = relationship("Import", back_populates="wordbook")


class Word(Base):
    __tablename__ = "words"
    
    id = Column(Integer, primary_key=True, index=True)
    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False, index=True)
    lemma = Column(String(100), nullable=False, index=True)
    pos = Column(String(20), nullable=True)  # part of speech
    gender = Column(String(1), nullable=True)  # m/f for French
    ipa = Column(String(200), nullable=True)  # IPA pronunciation
    meaning_zh = Column(Text, nullable=False)
    # New: multilingual translations stored as JSON string
    translations = Column(Text, nullable=True)
    # New: denormalized text for FTS (combined preferred translation)
    meaning_text = Column(Text, nullable=True)
    lesson = Column(String(10), nullable=True, index=True)  # L1, L2, etc.
    cefr = Column(String(2), nullable=True, index=True)  # A1, A2, B1, B2, C1, C2
    tags = Column(String(500), nullable=True)  # comma-separated tags
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    wordbook = relationship("Wordbook", back_populates="words")
    cards = relationship("Card", back_populates="word", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"
    
    id = Column(Integer, primary_key=True, index=True)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False, index=True)
    template = Column(String(50), nullable=False, default="basic")  # card template type
    hint = Column(Text, nullable=True)  # optional hint text
    tags = Column(String(500), nullable=True)  # additional card-specific tags
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    word = relationship("Word", back_populates="cards")
    srs_state = relationship("SRSState", back_populates="card", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="card", cascade="all, delete-orphan")
    examples = relationship("Example", back_populates="card", cascade="all, delete-orphan")


class SRSState(Base):
    __tablename__ = "srs_state"
    
    card_id = Column(Integer, ForeignKey("cards.id"), primary_key=True, index=True)
    due = Column(DateTime(timezone=True), nullable=False, index=True)
    interval = Column(Float, nullable=False, default=1.0)  # days
    ease = Column(Float, nullable=False, default=2.5)  # SM-2 ease factor
    reps = Column(Integer, nullable=False, default=0)  # number of repetitions
    lapses = Column(Integer, nullable=False, default=0)  # number of lapses
    algo = Column(Enum(SRSAlgorithm), nullable=False, default=SRSAlgorithm.SM2)
    last_reviewed = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    card = relationship("Card", back_populates="srs_state")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    grade = Column(Integer, nullable=False)  # 0=again, 1=hard, 2=good, 3=easy
    elapsed_ms = Column(Integer, nullable=True)  # time spent reviewing in milliseconds
    
    # Relationships
    card = relationship("Card", back_populates="reviews")


class Example(Base):
    __tablename__ = "examples"
    
    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    text_fr = Column(Text, nullable=False)  # French example sentence
    translation_zh = Column(Text, nullable=False)  # Chinese translation
    source = Column(String(100), nullable=True)  # source of example (AI, manual, etc.)
    audio_uri = Column(String(500), nullable=True)  # optional audio file path/URL
    cefr = Column(String(2), nullable=True)  # CEFR level of the example
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    card = relationship("Card", back_populates="examples")


class Import(Base):
    __tablename__ = "imports"
    
    id = Column(Integer, primary_key=True, index=True)
    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(ImportStatus), nullable=False, default=ImportStatus.PENDING, index=True)
    total = Column(Integer, nullable=False, default=0)
    succeeded = Column(Integer, nullable=False, default=0)
    failed = Column(Integer, nullable=False, default=0)
    message = Column(Text, nullable=True)  # error messages or notes
    
    # Relationships
    wordbook = relationship("Wordbook", back_populates="imports")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)  # JSON string
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
