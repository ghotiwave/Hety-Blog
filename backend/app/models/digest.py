from sqlalchemy import Column, Integer, String, Text, DateTime
from app.utils.timestamps import beijing_now_naive
from app.database import Base


class NewsDigest(Base):
    __tablename__ = "digests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    topic = Column(String(100), default="综合")
    content = Column(Text, nullable=False)
    source_urls = Column(Text, nullable=True)  # JSON array of URLs
    slug = Column(String(200), nullable=True, unique=True)
    created_at = Column(DateTime, default=beijing_now_naive)
