from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.timezone_utils import BEIJING_TZ
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    email_verified = Column(Integer, default=0)
    verification_token = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    signature = Column(String(200), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), default="user")
    created_at = Column(DateTime, default=lambda: datetime.now(BEIJING_TZ))

    scores = relationship("Score", back_populates="user", cascade="all, delete-orphan")
