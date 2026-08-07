from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AlbumPhotoUpdate(BaseModel):
    caption: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=200)
    taken_on: date | None = None
    alt_text: str | None = Field(default=None, max_length=300)
    show_in_carousel: bool | None = None
    show_in_gallery: bool | None = None
    carousel_order: int | None = Field(default=None, ge=0, le=1_000_000)
    gallery_order: int | None = Field(default=None, ge=0, le=1_000_000)
    published: bool | None = None


class AlbumPhotoRotate(BaseModel):
    degrees: Literal[-90, 90, 180]


class AlbumSettingsUpdate(BaseModel):
    autoplay_delay_ms: int = Field(ge=2000, le=20000)


class AlbumPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    thumbnail_url: str
    width: int
    height: int
    caption: str | None = None
    location: str | None = None
    taken_on: date | None = None
    alt_text: str | None = None
    show_in_carousel: bool
    show_in_gallery: bool
    carousel_order: int
    gallery_order: int
    published: bool
    created_at: str
    updated_at: str


class AlbumFeedResponse(BaseModel):
    carousel: list[AlbumPhotoResponse]
    gallery: list[AlbumPhotoResponse]
    autoplay_delay_ms: int


class AlbumAdminResponse(BaseModel):
    items: list[AlbumPhotoResponse]
    autoplay_delay_ms: int
