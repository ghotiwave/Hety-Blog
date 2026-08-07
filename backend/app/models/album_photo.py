from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text

from app.database import Base
from app.utils.timestamps import beijing_now_naive


class AlbumPhoto(Base):
    __tablename__ = "album_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    caption = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    taken_on = Column(Date, nullable=True)
    alt_text = Column(String(300), nullable=True)
    show_in_carousel = Column(Boolean, nullable=False, default=False)
    show_in_gallery = Column(Boolean, nullable=False, default=True)
    carousel_order = Column(Integer, nullable=False, default=0)
    gallery_order = Column(Integer, nullable=False, default=0)
    published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=beijing_now_naive)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=beijing_now_naive,
        onupdate=beijing_now_naive,
    )


class AlbumSettings(Base):
    __tablename__ = "album_settings"

    id = Column(Integer, primary_key=True, default=1)
    autoplay_delay_ms = Column(Integer, nullable=False, default=6500)
