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
    SECRET_KEY: str = 'your-super-secret-key-change-in-production'
    ALLOWED_HOSTS: str = 'localhost,127.0.0.1'
    WORKERS_COUNT: int = 1
    LOG_LEVEL: str = 'info'

    # API Documentation
    API_V1_STR: str = '/api/v1'
    OPENAPI_URL: str = f'{API_V1_STR}/openapi.json'
    DOCS_URL: str = f'{API_V1_STR}/docs'
    REDOC_URL: str = f'{API_V1_STR}/redoc'
    PROJECT_NAME: str = 'CINERENTAL API'
    PROJECT_DESCRIPTION: str = 'Equipment Rental Management System API'
    PROJECT_VERSION: str = '1.0.0'

    # Database
    POSTGRES_SERVER: str = 'localhost'
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = 'cinerental'
    POSTGRES_USER: str = 'postgres'
    POSTGRES_PASSWORD: str = 'postgres'

    # Redis
    REDIS_HOST: str = 'localhost'
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ''

    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = 'HS256'

    # CORS
    CORS_ORIGINS: str = 'http://localhost,http://localhost:8000,http://localhost:3000'

    # File Storage
    UPLOAD_DIR: str = './media'
    MAX_UPLOAD_SIZE: int = 10485760  # Hardcoded value for now

    @field_validator('ALLOWED_HOSTS', 'CORS_ORIGINS')
    @classmethod
    def parse_list_fields(cls, value: str) -> List[str]:
        """Parse comma-separated string fields into lists."""
        return parse_comma_separated_list(value)

    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=True,
        extra='allow',
    )

    @property
    def DATABASE_URL(self) -> str:
        """Get async database URL."""
        return (
            f'postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}'
            f'@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}'
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Get sync database URL."""
        return (
            f'postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}'
            f'@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}'
        )

    @property
    def REDIS_URL(self) -> str:
        """Get Redis URL."""
        auth = f':{self.REDIS_PASSWORD}@' if self.REDIS_PASSWORD else ''
        return f'redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}'


settings = Settings()
