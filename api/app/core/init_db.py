from app.core.database import engine, init_fts_tables, Base, SessionLocal
from app.models import models  # This imports all models


def create_tables():
    """Create all database tables and FTS5 virtual tables"""
    print("Creating database tables...")
    
    # Create all SQLAlchemy tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize FTS5 virtual tables
    print("Initializing FTS5 virtual tables...")
    init_fts_tables(engine)

    # Lightweight migrations for new columns (SQLite ADD COLUMN)
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE words ADD COLUMN translations TEXT"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE words ADD COLUMN meaning_text TEXT"))
            conn.commit()
    except Exception:
        pass
    # Backfill meaning_text if null
    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE words SET meaning_text = meaning_zh WHERE meaning_text IS NULL"))
            conn.commit()
    except Exception:
        pass
    
    # Ensure there is at least one active default wordbook
    try:
        db = SessionLocal()
        from app.models.models import Wordbook
        existing = db.query(Wordbook).count()
        if existing == 0:
            default = Wordbook(
                name="Default",
                description="Default wordbook",
                language="fr",
                is_active=True,
            )
            db.add(default)
            db.commit()
            print("Created default active wordbook")
        else:
            # Ensure at least one active
            active = db.query(Wordbook).filter(Wordbook.is_active == True).first()
            if not active:
                # Activate the most recent one
                wb = db.query(Wordbook).order_by(Wordbook.created_at.desc()).first()
                if wb:
                    wb.is_active = True
                    db.commit()
                    print(f"Activated wordbook '{wb.name}' as default")
    except Exception as e:
        print(f"Wordbook initialization skipped due to error: {e}")
    finally:
        try:
            db.close()
        except Exception:
            pass
    
    print("Database initialization completed!")


if __name__ == "__main__":
    create_tables()
