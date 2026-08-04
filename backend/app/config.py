from urllib.parse import urlparse

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
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_CALLBACK_URL: str = ""
    GITHUB_PROXY_URL: str = ""
    GITHUB_TOKEN_URL: str = "https://github.com/login/oauth/access_token"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


def validate_runtime_settings() -> None:
    secret = settings.SECRET_KEY.strip()
    insecure_values = {
        "",
        "change-me-in-production",
        "generate-a-random-string-here",
        "replace-with-at-least-32-random-characters",
    }
    if secret in insecure_values or len(secret) < 32:
        raise RuntimeError("SECRET_KEY 必须设置为至少 32 位的随机字符串，不能使用示例值")
    github_credentials = (
        bool(settings.GITHUB_CLIENT_ID.strip()),
        bool(settings.GITHUB_CLIENT_SECRET.strip()),
    )
    if github_credentials[0] != github_credentials[1]:
        raise RuntimeError("GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET 必须同时配置")
    token_url = urlparse(settings.GITHUB_TOKEN_URL.strip())
    try:
        token_port = token_url.port
    except ValueError as exc:
        raise RuntimeError("GITHUB_TOKEN_URL 端口无效") from exc
    if (
        token_url.scheme != "https"
        or token_url.hostname != "github.com"
        or token_port not in {None, 443}
        or token_url.path != "/login/oauth/access_token"
        or token_url.username
        or token_url.password
        or token_url.query
        or token_url.fragment
    ):
        raise RuntimeError("GITHUB_TOKEN_URL 必须是 GitHub 官方 OAuth token 地址")

    proxy_value = settings.GITHUB_PROXY_URL.strip()
    if proxy_value:
        proxy_url = urlparse(proxy_value)
        try:
            proxy_port = proxy_url.port
        except ValueError as exc:
            raise RuntimeError("GITHUB_PROXY_URL 端口无效") from exc
        if (
            proxy_url.scheme != "http"
            or proxy_url.hostname not in {"host.docker.internal", "172.17.0.1"}
            or proxy_port != 7890
            or proxy_url.username != "blog-github"
            or not proxy_url.password
            or proxy_url.path not in {"", "/"}
            or proxy_url.query
            or proxy_url.fragment
        ):
            raise RuntimeError("GITHUB_PROXY_URL 必须指向受认证的本机 Mihomo HTTP 代理")
