from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.album_photo import AlbumPhoto, AlbumSettings
from app.schemas.album import AlbumFeedResponse
from app.routers.admin_album import serialize_album_photo


router = APIRouter(prefix="/api/album", tags=["album"])


@router.get("", response_model=AlbumFeedResponse)
def album_feed(db: Session = Depends(get_db)):
    album_settings = db.get(AlbumSettings, 1)
    carousel = (
        db.query(AlbumPhoto)
        .filter(AlbumPhoto.published.is_(True), AlbumPhoto.show_in_carousel.is_(True))
        .order_by(AlbumPhoto.carousel_order.asc(), AlbumPhoto.id.asc())
        .all()
    )
    gallery = (
        db.query(AlbumPhoto)
        .filter(AlbumPhoto.published.is_(True), AlbumPhoto.show_in_gallery.is_(True))
        .order_by(AlbumPhoto.gallery_order.asc(), AlbumPhoto.id.asc())
        .all()
    )
    return {
        "carousel": [serialize_album_photo(photo) for photo in carousel],
        "gallery": [serialize_album_photo(photo) for photo in gallery],
        "autoplay_delay_ms": album_settings.autoplay_delay_ms if album_settings else 6500,
    }
