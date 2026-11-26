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
    # Your Supabase project address, like https://xxxx.supabase.co
    supabase_url: str = ""
    # Public key (safe to share). The server uses it together with the USER'S own login token,
    # so the database privacy rules still apply to every request.
    supabase_publishable_key: str = ""
    # How long to wait for the database before giving up (seconds).
    db_timeout_seconds: float = 10.0

    @property
    def cors_origin_list(self) -> list[str]:
        # Browsers send the address without a "/" at the end, so remove one if it was typed in.
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip().rstrip("/")]

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_issuer}/.well-known/jwks.json"

    @property
    def supabase_rest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
