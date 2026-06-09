from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///data/blog.db"
    UPLOAD_DIR: str = "uploads"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    AI_API_KEY: str = ""
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    AI_BASE_URL: str = "https://api.deepseek.com"
    AI_MODEL: str = "deepseek-v4-flash"
    # SMTP for email verification (optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False
    SITE_URL: str = "http://localhost:8000"
    SITE_NAME: str = "我的个人主页"
    SITE_DOMAIN: str = "gianniiss.top"
    RESEND_API_KEY: str = ""
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
