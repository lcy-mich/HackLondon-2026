from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    mongo_uri: str
    db_name: str = "library_seats"

    hivemq_host: str
    hivemq_port: int = 8883
    hivemq_username: str
    hivemq_password: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
