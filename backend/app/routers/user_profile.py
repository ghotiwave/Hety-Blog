"""User profile: avatar, signature."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.oauth_account import OAuthAccount
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/user", tags=["user-profile"])


class ProfileUpdate(BaseModel):
    avatar_url: str | None = Field(default=None, max_length=500)
    signature: str | None = Field(default=None, max_length=200)


@router.get("/profile")
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    github = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == user.id,
        OAuthAccount.provider == "github",
    ).first()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "signature": user.signature,
        "role": user.role,
        "github_linked": github is not None,
        "github_login": github.provider_username if github else None,
    }


@router.put("/profile")
def update_profile(
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    if req.signature is not None:
        user.signature = req.signature
    db.commit()
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "signature": user.signature,
    }
