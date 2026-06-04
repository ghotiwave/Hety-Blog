"""User profile: avatar, signature."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/user", tags=["user-profile"])


class ProfileUpdate(BaseModel):
    avatar_url: str | None = None
    signature: str | None = None


@router.get("/profile")
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "signature": user.signature,
        "role": user.role,
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
