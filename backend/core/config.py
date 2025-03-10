"""Application configuration module."""

import os
from typing import ClassVar, List

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_comma_separated_list(value: str | List[str]) -> List[str]:
    """Parse comma-separated string into list."""
    if isinstance(value, list):
        return value
    if value == '*':
        return ['*']
    return [item.strip() for item in value.split(',') if item.strip()]


# Production-safe значения по умолчанию
DEFAULT_SECRET_KEY = 'change-this-in-production-please-use-env-vars-instead'
DEFAULT_DB_PASS = 'change-me-in-production'


class Settings(BaseSettings):
    """Application settings."""

    ENV: ClassVar[str] = os.environ.get('ENVIRONMENT', 'development')

    # Application
    APP_NAME: str = 'CINERENTAL'
    ENVIRONMENT: str = os.environ.get('ENVIRONMENT', 'development')
    DEBUG: bool = os.environ.get('DEBUG', 'true').lower() in ('true', '1', 't')
    SECRET_KEY: str = Field(
        os.environ.get('SECRET_KEY', DEFAULT_SECRET_KEY),
        description='Secret key for security',
    )
    ALLOWED_HOSTS: str = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
    WORKERS_COUNT: int = int(os.environ.get('WORKERS_COUNT', '1'))
    LOG_LEVEL: str = os.environ.get('LOG_LEVEL', 'info')

    # API Documentation
    API_V1_STR: str = '/api/v1'
    OPENAPI_URL: str = f'{API_V1_STR}/openapi.json'
    DOCS_URL: str = f'{API_V1_STR}/docs'
    REDOC_URL: str = f'{API_V1_STR}/redoc'
    PROJECT_NAME: str = 'CINERENTAL API'
    PROJECT_DESCRIPTION: str = 'Equipment Rental Management System API'
    PROJECT_VERSION: str = '1.0.0'

    # Database
    POSTGRES_SERVER: str = os.environ.get('POSTGRES_SERVER', 'localhost')
    POSTGRES_PORT: int = int(os.environ.get('POSTGRES_PORT', '5432'))
    POSTGRES_DB: str = os.environ.get('POSTGRES_DB', 'cinerental')
    POSTGRES_USER: str = os.environ.get('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD: str = Field(
        os.environ.get('POSTGRES_PASSWORD', DEFAULT_DB_PASS),
        description='Database password should never be empty',
    )

    # Redis
    REDIS_HOST: str = os.environ.get('REDIS_HOST', 'localhost')
    REDIS_PORT: int = int(os.environ.get('REDIS_PORT', '6379'))
    REDIS_DB: int = int(os.environ.get('REDIS_DB', '0'))
    REDIS_PASSWORD: str = os.environ.get('REDIS_PASSWORD', '')

    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', '30')
    )
    ALGORITHM: str = os.environ.get('ALGORITHM', 'HS256')

    # CORS
    CORS_ORIGINS: str = os.environ.get(
        'CORS_ORIGINS', 'http://localhost,http://localhost:8000,http://localhost:3000'
    )

    # File Storage
    UPLOAD_DIR: str = os.environ.get('UPLOAD_DIR', './media')

    MAX_UPLOAD_SIZE: int = int(os.environ.get('MAX_UPLOAD_SIZE', '10485760'))

    @field_validator('ALLOWED_HOSTS', 'CORS_ORIGINS')
    @classmethod
    def parse_list_fields(cls, value: str) -> List[str]:
        """Parse comma-separated string fields into lists."""
        return parse_comma_separated_list(value)

    @field_validator('POSTGRES_PASSWORD')
    @classmethod
    def validate_postgres_password(cls, v: str, info: ValidationInfo) -> str:
        """Validate that database password is set, especially in production."""
        if not v:
            raise ValueError('Database password cannot be empty')

        env = os.environ.get('ENVIRONMENT', 'development')
        if env == 'production' and v == DEFAULT_DB_PASS:
            raise ValueError(
                'Default password is not allowed in production environment'
            )

        return v

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str, info: ValidationInfo) -> str:
        """Validate that secret key is set and secure in production."""
        if not v:
            raise ValueError('SECRET_KEY cannot be empty')

        env = os.environ.get('ENVIRONMENT', 'development')
        is_prod = env == 'production'
        is_default = v == DEFAULT_SECRET_KEY

        if is_prod and (is_default or len(v) < 32):
            raise ValueError(
                'Default or short SECRET_KEY is not allowed in production environment'
            )

        return v

    # Determine which env file to load based on environment
    @staticmethod
    def get_env_file() -> str:
        """Get the appropriate .env file based on environment."""
        env = os.environ.get('ENVIRONMENT', 'development')
        if env == 'production':
            return '.env.production'
        elif env == 'testing':
            return '.env.test'
        return '.env'

    model_config = SettingsConfigDict(
        env_file=get_env_file(),
        env_file_encoding='utf-8',
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


settings = Settings(
    SECRET_KEY=os.environ.get('SECRET_KEY', DEFAULT_SECRET_KEY),
    POSTGRES_PASSWORD=os.environ.get('POSTGRES_PASSWORD', DEFAULT_DB_PASS),
)
