from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.init_db import create_tables
from app.routers import imports, words, study, wordbooks
from app.routers import settings as settings_router


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(wordbooks.router)
app.include_router(imports.router)
app.include_router(words.router)
app.include_router(study.router)
app.include_router(settings_router.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    create_tables()


@app.get("/")
async def root():
    return {"message": "WordFlow API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/db/info")
async def db_info():
    """Database information endpoint"""
    from app.core.database import engine
    from sqlalchemy import inspect
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    return {
        "database": "SQLite",
        "tables": tables,
        "fts_enabled": "words_fts" in tables or "examples_fts" in tables
    }
