from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///data/blog.db"
    UPLOAD_DIR: str = "uploads"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DEEPSEEK_API_KEY: str = ""
    ADMIN_PASSWORD: str = "admin123"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
