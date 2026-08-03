from __future__ import annotations

import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
from authlib.common.security import generate_token
from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import HTTPException, Request, Response
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.oauth_account import OAuthAccount
from app.models.user import User


GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_API_URL = "https://api.github.com"
GITHUB_SCOPE = "read:user user:email"
GITHUB_STATE_COOKIE = "hety_github_oauth"
GITHUB_STATE_TTL_SECONDS = 600


class GitHubFlowError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class GitHubIdentity:
    provider_user_id: str
    login: str
    email: str
    avatar_url: str | None = None


def github_oauth_enabled() -> bool:
    return bool(settings.GITHUB_CLIENT_ID.strip() and settings.GITHUB_CLIENT_SECRET.strip())


def github_callback_url() -> str:
    configured = settings.GITHUB_CALLBACK_URL.strip()
    if configured:
        return configured
    return f"{settings.SITE_URL.rstrip('/')}/api/auth/github/callback"


def _oauth_client(*, state: str | None = None, token: dict | None = None) -> AsyncOAuth2Client:
    return AsyncOAuth2Client(
        client_id=settings.GITHUB_CLIENT_ID.strip(),
        client_secret=settings.GITHUB_CLIENT_SECRET.strip(),
        token_endpoint_auth_method="client_secret_post",
        redirect_uri=github_callback_url(),
        scope=GITHUB_SCOPE,
        state=state,
        token=token,
        code_challenge_method="S256",
        timeout=10,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Hety-Blog-OAuth",
        },
    )


async def create_github_authorization(mode: str, bind_user_id: int | None = None) -> tuple[str, str]:
    if not github_oauth_enabled():
        raise HTTPException(status_code=503, detail="GitHub 登录尚未配置")
    if mode not in {"login", "bind"} or (mode == "bind" and bind_user_id is None):
        raise ValueError("Invalid GitHub OAuth mode")

    verifier = generate_token(64)
    async with _oauth_client() as client:
        authorization_url, state = client.create_authorization_url(
            GITHUB_AUTHORIZE_URL,
            code_verifier=verifier,
        )
    expires = datetime.now(timezone.utc) + timedelta(seconds=GITHUB_STATE_TTL_SECONDS)
    state_token = jwt.encode(
        {
            "kind": "github_oauth",
            "state": state,
            "verifier": verifier,
            "mode": mode,
            "bind_user_id": bind_user_id,
            "exp": expires,
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )
    return authorization_url, state_token


def set_github_state_cookie(response: Response, state_token: str) -> None:
    response.set_cookie(
        GITHUB_STATE_COOKIE,
        state_token,
        max_age=GITHUB_STATE_TTL_SECONDS,
        httponly=True,
        secure=settings.SITE_URL.lower().startswith("https://"),
        samesite="lax",
        path="/api/auth/github/callback",
    )


def clear_github_state_cookie(response: Response) -> None:
    response.delete_cookie(
        GITHUB_STATE_COOKIE,
        path="/api/auth/github/callback",
        secure=settings.SITE_URL.lower().startswith("https://"),
        httponly=True,
        samesite="lax",
    )


def read_github_state(request: Request, returned_state: str | None) -> dict:
    token = request.cookies.get(GITHUB_STATE_COOKIE)
    if not token or not returned_state:
        raise GitHubFlowError("invalid_state")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError as exc:
        raise GitHubFlowError("invalid_state") from exc
    expected_state = str(payload.get("state") or "")
    if payload.get("kind") != "github_oauth" or not hmac.compare_digest(expected_state, returned_state):
        raise GitHubFlowError("invalid_state")
    if payload.get("mode") not in {"login", "bind"} or not payload.get("verifier"):
        raise GitHubFlowError("invalid_state")
    return payload


async def exchange_github_identity(code: str, state: str, verifier: str) -> GitHubIdentity:
    async with _oauth_client(state=state) as client:
        token = await client.fetch_token(
            settings.GITHUB_TOKEN_URL.strip(),
            code=code,
            code_verifier=verifier,
            headers={"Accept": "application/json", "Host": "github.com"},
        )
        client.token = token
        profile_response = await client.get(f"{GITHUB_API_URL}/user")
        profile_response.raise_for_status()
        emails_response = await client.get(f"{GITHUB_API_URL}/user/emails", params={"per_page": 100})
        emails_response.raise_for_status()

    profile = profile_response.json()
    emails = emails_response.json()
    verified = [item for item in emails if item.get("verified") and item.get("email")]
    selected = next((item for item in verified if item.get("primary")), verified[0] if verified else None)
    if not selected:
        raise GitHubFlowError("no_verified_email")
    provider_user_id = str(profile.get("id") or "")
    login = str(profile.get("login") or "").strip()
    email = str(selected["email"]).strip().lower()
    avatar_url = str(profile.get("avatar_url") or "").strip() or None
    if (
        not provider_user_id.isdigit()
        or len(provider_user_id) > 100
        or not login
        or len(login) > 100
        or len(email) > 100
        or "@" not in email
    ):
        raise GitHubFlowError("invalid_profile")
    if avatar_url and (len(avatar_url) > 500 or not avatar_url.startswith("https://")):
        avatar_url = None
    return GitHubIdentity(
        provider_user_id=provider_user_id,
        login=login,
        email=email,
        avatar_url=avatar_url,
    )


def _unique_github_username(db: Session, login: str) -> str:
    cleaned = login.strip()[:20] or "github-user"
    candidate = cleaned
    suffix = 2
    while db.query(User.id).filter(func.lower(User.username) == candidate.lower()).first():
        marker = f"-{suffix}"
        candidate = f"{cleaned[:20 - len(marker)]}{marker}"
        suffix += 1
    return candidate


def resolve_github_user(
    db: Session,
    identity: GitHubIdentity,
    *,
    mode: str,
    bind_user_id: int | None = None,
) -> tuple[User, str]:
    linked = db.query(OAuthAccount).filter(
        OAuthAccount.provider == "github",
        OAuthAccount.provider_user_id == identity.provider_user_id,
    ).first()

    if mode == "bind":
        user = db.get(User, bind_user_id) if bind_user_id is not None else None
        if not user:
            raise GitHubFlowError("bind_session_expired")
        if linked and linked.user_id != user.id:
            raise GitHubFlowError("account_conflict")
        existing_for_user = db.query(OAuthAccount).filter(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == "github",
        ).first()
        if existing_for_user and existing_for_user.provider_user_id != identity.provider_user_id:
            raise GitHubFlowError("already_bound")
        if not linked and not existing_for_user:
            db.add(OAuthAccount(
                user_id=user.id,
                provider="github",
                provider_user_id=identity.provider_user_id,
                provider_username=identity.login,
            ))
        elif linked:
            linked.provider_username = identity.login
        if not user.avatar_url and identity.avatar_url:
            user.avatar_url = identity.avatar_url
        db.commit()
        db.refresh(user)
        return user, "bound"

    if linked:
        user = db.get(User, linked.user_id)
        if not user:
            raise GitHubFlowError("account_conflict")
        linked.provider_username = identity.login
        if not user.avatar_url and identity.avatar_url:
            user.avatar_url = identity.avatar_url
        db.commit()
        return user, "login"

    email_owner = db.query(User).filter(func.lower(User.email) == identity.email).first()
    if email_owner:
        raise GitHubFlowError("existing_email")

    random_password = secrets.token_urlsafe(32).encode("utf-8")
    user = User(
        username=_unique_github_username(db, identity.login),
        email=identity.email,
        email_verified=1,
        avatar_url=identity.avatar_url,
        password_hash=bcrypt.hashpw(random_password, bcrypt.gensalt()).decode(),
    )
    db.add(user)
    db.flush()
    db.add(OAuthAccount(
        user_id=user.id,
        provider="github",
        provider_user_id=identity.provider_user_id,
        provider_username=identity.login,
    ))
    db.commit()
    db.refresh(user)
    return user, "created"
