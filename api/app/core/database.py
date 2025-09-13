import sqlite3
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

SQLALCHEMY_DATABASE_URL = "sqlite:///./wordflow.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable WAL mode and other SQLite optimizations"""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL;")
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys=ON;")
        # Enable FTS5 extension
        cursor.execute("PRAGMA compile_options;")
        cursor.close()


def get_db():
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_fts_tables(engine):
    """Initialize FTS5 virtual tables for full-text search"""
    from sqlalchemy import text
    
    with engine.connect() as conn:
        # Create FTS5 virtual table for words
        conn.execute(text("""
        CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
            id UNINDEXED,
            lemma,
            meaning_zh,
            pos,
            lesson,
            tags,
            content='words',
            content_rowid='id'
        );
        """))
        
        # Create FTS5 virtual table for examples
        conn.execute(text("""
        CREATE VIRTUAL TABLE IF NOT EXISTS examples_fts USING fts5(
            id UNINDEXED,
            text_fr,
            translation_zh,
            content='examples',
            content_rowid='id'
        );
        """))
        
        # Triggers to keep FTS5 tables in sync
        conn.execute(text("""
        CREATE TRIGGER IF NOT EXISTS words_fts_insert AFTER INSERT ON words BEGIN
            INSERT INTO words_fts(id, lemma, meaning_zh, pos, lesson, tags)
            VALUES (new.id, new.lemma, ifnull(new.meaning_text, new.meaning_zh), new.pos, new.lesson, new.tags);
        END;
        """))
        
        conn.execute(text("""
        CREATE TRIGGER IF NOT EXISTS words_fts_delete AFTER DELETE ON words BEGIN
            INSERT INTO words_fts(words_fts, id, lemma, meaning_zh, pos, lesson, tags)
            VALUES ('delete', old.id, old.lemma, old.meaning_zh, old.pos, old.lesson, old.tags);
        END;
        """))
        
        conn.execute(text("""
        CREATE TRIGGER IF NOT EXISTS words_fts_update AFTER UPDATE ON words BEGIN
            INSERT INTO words_fts(words_fts, id, lemma, meaning_zh, pos, lesson, tags)
            VALUES ('delete', old.id, old.lemma, ifnull(old.meaning_text, old.meaning_zh), old.pos, old.lesson, old.tags);
            INSERT INTO words_fts(id, lemma, meaning_zh, pos, lesson, tags)
            VALUES (new.id, new.lemma, ifnull(new.meaning_text, new.meaning_zh), new.pos, new.lesson, new.tags);
        END;
        """))
        
        conn.commit()
