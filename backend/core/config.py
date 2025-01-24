"""Application configuration module."""

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_comma_separated_list(value: str | List[str]) -> List[str]:
    """Parse comma-separated string into list."""
    if isinstance(value, list):
        return value
    return [item.strip() for item in value.split(',') if item.strip()]


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = 'CINERENTAL'
    ENVIRONMENT: str = 'development'
    DEBUG: bool = True
    SECRET_KEY: str
    ALLOWED_HOSTS: str = 'localhost,127.0.0.1'

    # Database
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    @property
    def DATABASE_URL(self) -> str:
        """Get database URL."""
        return (
            f'postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}'
            f'@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}'
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Get synchronous database URL for Alembic."""
        return (
            f'postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}'
            f'@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}'
        )

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    @property
    def REDIS_URL(self) -> str:
        """Get Redis URL."""
        return f'redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}'

    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = 'HS256'

    # CORS
    CORS_ORIGINS: str = 'http://localhost,http://localhost:8000,http://localhost:3000'

    # File Storage
    UPLOAD_DIR: str = './media'
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    @field_validator('ALLOWED_HOSTS', 'CORS_ORIGINS')
    @classmethod
    def parse_list_fields(cls, value: str) -> List[str]:
        """Parse comma-separated string fields into lists."""
        return parse_comma_separated_list(value)

    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=True,
    )


settings = Settings()
