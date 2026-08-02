import ipaddress
import re
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.timezone_utils import BEIJING_TZ
import bcrypt
import httpx
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse, UserResponse, SendCodeRequest
from app.dependencies import get_current_user
from app.services.email_service import send_verification_code, verify_code

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory rate limiter
_register_attempts: dict[str, list[float]] = {}
_code_attempts: dict[str, list[float]] = {}
_login_attempts: dict[str, list[float]] = {}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.get("/config")
def public_auth_config():
    return {"turnstile_site_key": settings.TURNSTILE_SITE_KEY or None}


def _validate_username(username: str):
    username = username.strip()
    if len(username) < 1 or len(username) > 20:
        raise HTTPException(status_code=422, detail="用户名长度需在 1-20 位之间")
    if re.search(r'[<>\"\';&|`$(){}]', username):
        raise HTTPException(status_code=422, detail="用户名包含非法字符")
    return username


def _validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="密码至少需要 8 位")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="密码不能超过 bcrypt 的 72 字节限制")
    return password


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if len(normalized) > 100 or not EMAIL_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="请提供有效的邮箱地址")
    return normalized


def _client_ip(request: Request) -> str:
    """Resolve the original client behind the trusted local Caddy/Nginx chain."""
    forwarded = (getattr(request, "headers", {}) or {}).get("x-forwarded-for", "")
    candidate = forwarded.split(",", 1)[0].strip() if forwarded else ""
    try:
        if candidate:
            return str(ipaddress.ip_address(candidate))
    except ValueError:
        pass
    return request.client.host if request.client else "unknown"


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
    expire = datetime.now(BEIJING_TZ) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
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


def _check_code_rate_limit(key: str, max_attempts: int = 3, window: int = 60) -> bool:
    now = time.time()
    attempts = [t for t in _code_attempts.get(key, []) if now - t < window]
    _code_attempts[key] = attempts
    return len(attempts) < max_attempts


def _record_code_attempt(key: str):
    if key not in _code_attempts:
        _code_attempts[key] = []
    _code_attempts[key].append(time.time())


def _check_login_rate_limit(key: str, max_attempts: int = 10, window: int = 900) -> bool:
    now = time.time()
    attempts = [t for t in _login_attempts.get(key, []) if now - t < window]
    _login_attempts[key] = attempts
    return len(attempts) < max_attempts


def _record_login_attempt(key: str):
    _login_attempts.setdefault(key, []).append(time.time())


@router.post("/send-code")
def send_code(request: Request, req: SendCodeRequest, db: Session = Depends(get_db)):
    """Send a 6-digit verification code to the email."""
    email = _normalize_email(req.email)

    # Rate limit per email: 3 per minute, 10 per hour
    if not _check_code_rate_limit(email, 3, 60):
        raise HTTPException(status_code=429, detail="发送过于频繁，请 1 分钟后再试")
    if not _check_code_rate_limit(f"hourly:{email}", 10, 3600):
        raise HTTPException(status_code=429, detail="发送次数过多，请 1 小时后再试")
    client_ip = _client_ip(request)
    if not _check_code_rate_limit(f"ip-hourly:{client_ip}", 20, 3600):
        raise HTTPException(status_code=429, detail="当前网络发送次数过多，请稍后再试")

    _record_code_attempt(email)
    _record_code_attempt(f"hourly:{email}")
    _record_code_attempt(f"ip-hourly:{client_ip}")

    if settings.RESEND_API_KEY:
        ok = send_verification_code(email)
        if not ok:
            raise HTTPException(status_code=500, detail="邮件发送失败，请稍后再试")
    else:
        # Dev mode: log the code
        from app.services.email_service import store_code
        code = store_code(email)
        print(f"[DEV] Verification code for {email}: {code}")

    return {"message": "验证码已发送"}


@router.post("/register")
async def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    client_ip = _client_ip(request)

    username = _validate_username(req.username)
    _validate_password(req.password)
    email = _normalize_email(req.email)

    # Rate limit: 3 per hour per IP
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="注册过于频繁，请稍后再试")

    # Turnstile verification
    if settings.TURNSTILE_SECRET_KEY:
        if not req.turnstile_token:
            raise HTTPException(status_code=400, detail="请完成人机验证")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={
                    "secret": settings.TURNSTILE_SECRET_KEY,
                    "response": req.turnstile_token,
                })
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="人机验证服务暂时不可用，请稍后重试") from exc
        else:
            if not resp.json().get("success"):
                _record_attempt(client_ip)
                raise HTTPException(status_code=400, detail="人机验证失败")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="用户名已被注册")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    # Development mode logs the generated code instead of emailing it, but it
    # must still verify the exact stored value. Never turn a missing provider
    # configuration into an authentication bypass.
    if not req.code:
        raise HTTPException(status_code=400, detail="请输入邮箱验证码")
    if not verify_code(email, req.code):
        _record_attempt(client_ip)
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    _record_attempt(client_ip)

    user = User(
        username=username,
        email=email,
        email_verified=1,
        password_hash=bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)
    return TokenResponse(access_token=token, user=user_to_response(user))


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
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    identifier = req.username.strip()
    attempt_key = f"{_client_ip(request)}:{identifier.lower()}"
    if not _check_login_rate_limit(attempt_key):
        raise HTTPException(status_code=429, detail="登录尝试过于频繁，请稍后再试")
    # Preserve exact username semantics first; only fall back to email lookup.
    # This makes the result deterministic even if a username resembles another user's email.
    user = db.query(User).filter(User.username == identifier).first()
    if not user:
        user = db.query(User).filter(func.lower(User.email) == identifier.lower()).first()
    if not user or not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
        _record_login_attempt(attempt_key)
        raise HTTPException(status_code=401, detail="用户名、邮箱或密码错误")
    _login_attempts.pop(attempt_key, None)
    token = create_token(user)
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
