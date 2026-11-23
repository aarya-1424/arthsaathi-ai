"""App settings. All values come from environment variables or a local .env file.

Secrets (API keys, database passwords) must NEVER be written in code.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ArthSaathi API"
    environment: str = "development"  # development | production
    # Websites that are allowed to call this API (comma separated).
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
