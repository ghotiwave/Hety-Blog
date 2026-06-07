from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from app.database import Base


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, default="Your Name")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    interests = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    github_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    qq = Column(String(50), nullable=True)
    douyin = Column(String(500), nullable=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
