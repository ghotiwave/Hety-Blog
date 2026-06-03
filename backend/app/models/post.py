from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(500), nullable=True)
    cover_image = Column(String(500), nullable=True)
    tags = Column(String(500), nullable=True)  # comma-separated tags
    view_count = Column(Integer, default=0)
    published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
