from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.utils.timestamps import beijing_now_naive
from app.database import Base


class ReadingHistory(Base):
    __tablename__ = "reading_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    visited_at = Column(DateTime, default=beijing_now_naive)

    user = relationship("User")
    post = relationship("Post")
