from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.timezone_utils import BEIJING_TZ
from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(500), nullable=True)
    cover_image = Column(String(500), nullable=True)
    tags = Column(String(500), nullable=True)
    post_type = Column(String(20), default="blog")  # "blog" or "note"
    slug = Column(String(200), nullable=True, unique=True)
    view_count = Column(Integer, default=0)
    published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(BEIJING_TZ))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(BEIJING_TZ),
        onupdate=lambda: datetime.now(BEIJING_TZ),
    )

    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
