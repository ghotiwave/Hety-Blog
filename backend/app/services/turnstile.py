import httpx
from fastapi import HTTPException

from app.config import settings


async def require_turnstile(token: str | None, remote_ip: str | None = None) -> None:
    """Validate a Turnstile token whenever the server-side integration is enabled."""
    if not settings.TURNSTILE_SECRET_KEY:
        return
    if not token:
        raise HTTPException(status_code=400, detail="请完成人机验证")

    payload = {
        "secret": settings.TURNSTILE_SECRET_KEY,
        "response": token,
    }
    if remote_ip and remote_ip != "unknown":
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="人机验证服务暂时不可用，请稍后重试") from exc
    if not response.json().get("success"):
        raise HTTPException(status_code=400, detail="人机验证失败")
