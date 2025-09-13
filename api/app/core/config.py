from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_name: str = "WordFlow API"
    app_env: str = "dev"
    app_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    openai_api_key: str | None = None
    
    class Config:
        env_file = ".env"


settings = Settings()