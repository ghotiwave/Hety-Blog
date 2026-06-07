from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin/profile", tags=["admin-profile"])


def _serialize(p):
    return ProfileResponse(
        id=p.id,
        name=p.name,
        bio=p.bio,
        avatar_url=p.avatar_url,
        interests=p.interests,
        experience=p.experience,
        github_url=p.github_url,
        twitter_url=p.twitter_url,
        qq=p.qq,
        douyin=p.douyin,
        updated_at=p.updated_at.isoformat() if p.updated_at else "",
    )


@router.get("", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(id=1, name="Your Name")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return _serialize(profile)


@router.put("", response_model=ProfileResponse)
def update_profile(req: ProfileUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(id=1)
        db.add(profile)
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return _serialize(profile)
