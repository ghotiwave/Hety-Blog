from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.dependencies import get_current_admin
from app.utils.timestamps import beijing_isoformat

router = APIRouter(prefix="/api/admin/profile", tags=["admin-profile"])


def _serialize(p, db=None):
    avatar = p.avatar_url
    if not avatar and db:
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
def get_profile(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile(id=1, name="Your Name")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return _serialize(profile, db)


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
    return _serialize(profile, db)
