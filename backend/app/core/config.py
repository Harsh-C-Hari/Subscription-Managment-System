import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/brightloop"
    TEST_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/brightloop_test"

    JWT_SECRET_KEY: str = "default_secret_key_change_me_to_a_long_random_string_hs256"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    ADMIN_EMAIL: str = "admin@brightloop.com"
    ADMIN_PASSWORD: str = "Admin@12345"
    ADMIN_FULL_NAME: str = "Brightloop Admin"

    APP_ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
