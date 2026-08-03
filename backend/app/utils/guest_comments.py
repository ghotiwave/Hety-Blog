from __future__ import annotations

import hashlib
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, Request, Response
from jose import JWTError, jwt
from sqlalchemy import Engine, inspect, text

from app.config import settings


GUEST_COOKIE_NAME = "hety_guest_identity"
GUEST_COOKIE_DAYS = 180
_guest_comment_attempts: dict[str, list[float]] = {}


def ensure_guest_comment_columns(engine: Engine) -> None:
    """Add guest metadata columns to databases created before guest comments existed."""
    with engine.begin() as connection:
        if "comments" not in set(inspect(connection).get_table_names()):
            return
        existing = {column["name"] for column in inspect(connection).get_columns("comments")}
        additions = {
            "guest_name": "VARCHAR(20)",
            "guest_email": "VARCHAR(100)",
            "guest_key_hash": "VARCHAR(64)",
            "reply_to_name_override": "VARCHAR(20)",
        }
        for column_name, column_type in additions.items():
            if column_name not in existing:
                connection.execute(text(f'ALTER TABLE comments ADD COLUMN "{column_name}" {column_type}'))
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_comments_guest_key_hash ON comments (guest_key_hash)")
        )


def resolve_guest_identity(request: Request) -> str:
    token = (getattr(request, "cookies", {}) or {}).get(GUEST_COOKIE_NAME)
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("kind") == "guest" and payload.get("sub"):
                return str(payload["sub"])
        except JWTError:
            pass
    return uuid4().hex


def set_guest_identity_cookie(response: Response, guest_id: str) -> None:
    expires = datetime.now(timezone.utc) + timedelta(days=GUEST_COOKIE_DAYS)
    token = jwt.encode(
        {"sub": guest_id, "kind": "guest", "exp": expires},
        settings.SECRET_KEY,
        algorithm="HS256",
    )
    response.set_cookie(
        GUEST_COOKIE_NAME,
        token,
        max_age=GUEST_COOKIE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.SITE_URL.lower().startswith("https://"),
        samesite="lax",
        path="/api/posts",
    )


def guest_key_hash(guest_id: str) -> str:
    return hashlib.sha256(guest_id.encode("utf-8")).hexdigest()


def default_guest_name(guest_id: str) -> str:
    return f"Guest-{guest_id[:8].upper()}"


def consume_guest_comment_limit(ip: str, identity_hash: str) -> None:
    """Apply short- and long-window limits to both the browser identity and IP."""
    now = time.time()
    rules = (
        (f"identity:10m:{identity_hash}", 5, 600),
        (f"identity:1h:{identity_hash}", 20, 3600),
        (f"ip:10m:{ip}", 12, 600),
        (f"ip:1h:{ip}", 60, 3600),
    )
    refreshed: list[tuple[str, list[float]]] = []
    for key, maximum, window in rules:
        attempts = [attempt for attempt in _guest_comment_attempts.get(key, []) if now - attempt < window]
        _guest_comment_attempts[key] = attempts
        if len(attempts) >= maximum:
            raise HTTPException(status_code=429, detail="游客评论过于频繁，请稍后再试")
        refreshed.append((key, attempts))
    for key, attempts in refreshed:
        attempts.append(now)
        _guest_comment_attempts[key] = attempts
