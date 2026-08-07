from pathlib import Path
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.album_photo import AlbumPhoto, AlbumSettings
from app.models.user import User
from app.schemas.album import (
    AlbumAdminResponse,
    AlbumPhotoResponse,
    AlbumPhotoRotate,
    AlbumPhotoUpdate,
    AlbumSettingsUpdate,
)
from app.services.album_images import (
    MAX_ALBUM_UPLOAD_BYTES,
    remove_album_image_files,
    rotate_album_image,
    store_album_image,
)
from app.utils.timestamps import beijing_isoformat
from app.utils.timestamps import beijing_now_naive


router = APIRouter(prefix="/api/admin/album", tags=["admin-album"])


def serialize_album_photo(photo: AlbumPhoto) -> AlbumPhotoResponse:
    return AlbumPhotoResponse(
        id=photo.id,
        image_url=photo.image_url,
        thumbnail_url=photo.thumbnail_url,
        width=photo.width,
        height=photo.height,
        caption=photo.caption,
        location=photo.location,
        taken_on=photo.taken_on,
        alt_text=photo.alt_text,
        show_in_carousel=photo.show_in_carousel,
        show_in_gallery=photo.show_in_gallery,
        carousel_order=photo.carousel_order,
        gallery_order=photo.gallery_order,
        published=photo.published,
        created_at=beijing_isoformat(photo.created_at),
        updated_at=beijing_isoformat(photo.updated_at),
    )


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _next_order(db: Session, column) -> int:
    current = db.query(func.max(column)).scalar() or 0
    return current + 10


@router.get("", response_model=AlbumAdminResponse)
def list_album_photos(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    photos = db.query(AlbumPhoto).order_by(AlbumPhoto.created_at.desc(), AlbumPhoto.id.desc()).all()
    album_settings = db.get(AlbumSettings, 1)
    return {
        "items": [serialize_album_photo(photo) for photo in photos],
        "autoplay_delay_ms": album_settings.autoplay_delay_ms if album_settings else 6500,
    }


@router.put("/settings", response_model=dict[str, int])
def update_album_settings(
    req: AlbumSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    album_settings = db.get(AlbumSettings, 1)
    if not album_settings:
        album_settings = AlbumSettings(id=1)
        db.add(album_settings)
    album_settings.autoplay_delay_ms = req.autoplay_delay_ms
    db.commit()
    return {"autoplay_delay_ms": album_settings.autoplay_delay_ms}


@router.post("", response_model=AlbumPhotoResponse, status_code=201)
async def create_album_photo(
    file: UploadFile = File(...),
    caption: str = Form(""),
    location: str = Form(""),
    taken_on: str = Form(""),
    alt_text: str = Form(""),
    rotation: int = Form(0),
    show_in_carousel: bool = Form(False),
    show_in_gallery: bool = Form(True),
    published: bool = Form(True),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if len(caption) > 1000 or len(location) > 200 or len(alt_text) > 300:
        raise HTTPException(status_code=422, detail="照片文字、地点或替代文本过长")
    try:
        parsed_taken_on = date.fromisoformat(taken_on) if taken_on.strip() else None
    except ValueError as error:
        raise HTTPException(status_code=422, detail="照片日期格式无效") from error
    contents = await file.read(MAX_ALBUM_UPLOAD_BYTES + 1)
    stored = store_album_image(contents, rotation=rotation)
    fallback_alt = (Path(file.filename or "").stem.strip()[:300] or None)
    photo = AlbumPhoto(
        image_url=stored.image_url,
        thumbnail_url=stored.thumbnail_url,
        width=stored.width,
        height=stored.height,
        caption=_clean_optional_text(caption),
        location=_clean_optional_text(location),
        taken_on=parsed_taken_on or stored.taken_on,
        alt_text=_clean_optional_text(alt_text) or fallback_alt,
        show_in_carousel=show_in_carousel,
        show_in_gallery=show_in_gallery,
        carousel_order=_next_order(db, AlbumPhoto.carousel_order),
        gallery_order=_next_order(db, AlbumPhoto.gallery_order),
        published=published,
    )
    try:
        db.add(photo)
        db.commit()
        db.refresh(photo)
    except Exception:
        db.rollback()
        remove_album_image_files(stored.image_url, stored.thumbnail_url)
        raise
    return serialize_album_photo(photo)


@router.post("/{photo_id}/rotate", response_model=AlbumPhotoResponse)
def rotate_album_photo(
    photo_id: int,
    req: AlbumPhotoRotate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    photo = db.get(AlbumPhoto, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    stored = rotate_album_image(photo.image_url, photo.thumbnail_url, req.degrees)
    photo.image_url = stored.image_url
    photo.thumbnail_url = stored.thumbnail_url
    photo.width = stored.width
    photo.height = stored.height
    photo.updated_at = beijing_now_naive()
    try:
        db.commit()
        db.refresh(photo)
    except Exception:
        db.rollback()
        raise
    return serialize_album_photo(photo)


@router.put("/{photo_id}", response_model=AlbumPhotoResponse)
def update_album_photo(
    photo_id: int,
    req: AlbumPhotoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    photo = db.get(AlbumPhoto, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    values = req.model_dump(exclude_unset=True)
    for field in ("caption", "location", "alt_text"):
        if field in values:
            values[field] = _clean_optional_text(values[field])
    for field, value in values.items():
        if value is not None or field in ("caption", "location", "alt_text"):
            setattr(photo, field, value)
    db.commit()
    db.refresh(photo)
    return serialize_album_photo(photo)


@router.delete("/{photo_id}", status_code=204)
def delete_album_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    photo = db.get(AlbumPhoto, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    urls = (photo.image_url, photo.thumbnail_url)
    db.delete(photo)
    db.commit()
    remove_album_image_files(*urls)
