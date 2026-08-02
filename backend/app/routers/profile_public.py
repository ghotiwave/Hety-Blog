from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileResponse
from app.utils.timestamps import beijing_isoformat

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _serialize(p, db: Session):
    # Use admin user's avatar if profile avatar is not set
    avatar = p.avatar_url
    if not avatar:
        admin = db.query(User).filter(User.role == "admin").first()
        avatar = admin.avatar_url if admin else None

    return ProfileResponse(
        id=p.id,
        name=p.name,
        bio=p.bio,
        avatar_url=avatar,
        interests=p.interests,
        experience=p.experience,
        github_url=p.github_url,
        twitter_url=p.twitter_url,
        qq=p.qq,
        douyin=p.douyin,
        about_page=p.about_page,
        email_public=p.email_public,
        updated_at=beijing_isoformat(p.updated_at),
    )


@router.get("", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(id=1, name="Your Name")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return _serialize(profile, db)
