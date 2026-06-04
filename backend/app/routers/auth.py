import secrets
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
import bcrypt
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="用户名已被注册")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

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
