import logging
from urllib.parse import quote, urlencode

import httpx
from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.routers.auth import create_token
from app.services.github_oauth import (
    GitHubFlowError,
    clear_github_state_cookie,
    create_github_authorization,
    exchange_github_identity,
    read_github_state,
    resolve_github_user,
    set_github_state_cookie,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth/github", tags=["github-auth"])


def _frontend_redirect(path: str, *, error: str | None = None, token: str | None = None) -> RedirectResponse:
    target = f"{settings.SITE_URL.rstrip('/')}{path}"
    if error:
        target = f"{target}?{urlencode({'oauth_error': error})}"
    if token:
        target = f"{target}#token={quote(token, safe='')}"
    response = RedirectResponse(target, status_code=303)
    clear_github_state_cookie(response)
    return response


@router.get("/start")
async def start_github_login():
    authorization_url, state_token = await create_github_authorization("login")
    response = RedirectResponse(authorization_url, status_code=302)
    set_github_state_cookie(response, state_token)
    return response


@router.post("/bind")
async def start_github_bind(
    response: Response,
    user: User = Depends(get_current_user),
):
    authorization_url, state_token = await create_github_authorization("bind", user.id)
    set_github_state_cookie(response, state_token)
    return {"authorization_url": authorization_url}


@router.get("/callback", name="github_oauth_callback")
async def github_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db: Session = Depends(get_db),
):
    error_path = "/login"
    if error:
        try:
            oauth_state = read_github_state(request, state)
            if oauth_state.get("mode") == "bind":
                error_path = "/profile"
        except GitHubFlowError:
            pass
        return _frontend_redirect(error_path, error="cancelled")
    try:
        oauth_state = read_github_state(request, state)
        mode = str(oauth_state["mode"])
        error_path = "/profile" if mode == "bind" else "/login"
        if not code:
            raise GitHubFlowError("missing_code")
        identity = await exchange_github_identity(
            code,
            str(oauth_state["state"]),
            str(oauth_state["verifier"]),
        )
        user, result = resolve_github_user(
            db,
            identity,
            mode=mode,
            bind_user_id=oauth_state.get("bind_user_id"),
        )
    except GitHubFlowError as exc:
        return _frontend_redirect(error_path, error=exc.code)
    except (OAuthError, httpx.HTTPError, ValueError, KeyError, IntegrityError):
        db.rollback()
        logger.exception("GitHub OAuth callback failed")
        return _frontend_redirect(error_path, error="provider_error")

    if result == "bound":
        return _frontend_redirect("/profile?github=linked")
    return _frontend_redirect("/auth/github/complete", token=create_token(user))
