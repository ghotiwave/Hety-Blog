import secrets
import re
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
import bcrypt
import httpx
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory rate limiter
_register_attempts: dict[str, list[float]] = {}


def _validate_username(username: str):
    if len(username) < 1 or len(username) > 20:
        raise HTTPException(status_code=422, detail="用户名长度需在 1-20 位之间")
    if re.search(r'[<>\"\';&|`$(){}]', username):
        raise HTTPException(status_code=422, detail="用户名包含非法字符")
    return username.strip()


def _validate_password(password: str):
    if len(password) < 4 or len(password) > 12:
        raise HTTPException(status_code=422, detail="密码长度需在 4-12 位之间")
    if re.search(r'[一-鿿]', password):
        raise HTTPException(status_code=422, detail="密码不允许包含中文字符")
    return password


def _check_rate_limit(ip: str, max_attempts: int = 3, window: int = 3600) -> bool:
    now = time.time()
    attempts = [t for t in _register_attempts.get(ip, []) if now - t < window]
    _register_attempts[ip] = attempts
    return len(attempts) < max_attempts


def _record_attempt(ip: str):
    if ip not in _register_attempts:
        _register_attempts[ip] = []
    _register_attempts[ip].append(time.time())


def create_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user.id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def user_to_response(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "email_verified": bool(user.email_verified),
        "avatar_url": user.avatar_url,
        "signature": user.signature,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@router.post("/register")
async def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"

    _validate_username(req.username)
    _validate_password(req.password)

    # Rate limit: 3 per hour per IP
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="注册过于频繁，请稍后再试")

    # Turnstile verification
    if settings.TURNSTILE_SECRET_KEY and hasattr(req, "turnstile_token") and req.turnstile_token:
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={
                "secret": settings.TURNSTILE_SECRET_KEY,
                "response": req.turnstile_token,
            })
            if not resp.json().get("success"):
                _record_attempt(client_ip)
                raise HTTPException(status_code=400, detail="人机验证失败")

    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="用户名已被注册")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    _record_attempt(client_ip)

    verify_token = secrets.token_urlsafe(32)
    user = User(
        username=req.username,
        email=req.email,
        verification_token=verify_token,
        password_hash=bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email via Resend (or fall back to returning the link)
    from app.services.email_service import send_verification_email
    sent = send_verification_email(req.email, verify_token)

    token = create_token(user)
    resp = TokenResponse(access_token=token, user=user_to_response(user))
    result = resp.model_dump()
    if not sent:
        result["verify_url"] = f"{settings.SITE_URL}/api/auth/verify/{verify_token}"
    return result


@router.get("/verify/{token}", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        return HTMLResponse("<h2>链接无效或已过期</h2>", status_code=404)
    user.email_verified = 1
    user.verification_token = None
    db.commit()
    return HTMLResponse("<h2>邮箱验证成功！你现在可以关闭此页面。</h2>")


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_token(user)
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
