from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import os

from fastapi import HTTPException
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from app.config import settings


register_heif_opener()

MAX_ALBUM_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_ALBUM_PIXELS = 60_000_000
DISPLAY_MAX_DIM = 2560
THUMBNAIL_MAX_DIM = 960
ALLOWED_ALBUM_FORMATS = {"HEIF", "HEIC", "JPEG", "MPO", "PNG", "WEBP"}


@dataclass(frozen=True)
class StoredAlbumImage:
    image_url: str
    thumbnail_url: str
    width: int
    height: int


def _save_webp(image: Image.Image, path: str, max_dimension: int, quality: int) -> None:
    output = image.copy()
    output.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    has_alpha = "A" in output.getbands() or (
        output.mode == "P" and "transparency" in output.info
    )
    normalized = output.convert("RGBA" if has_alpha else "RGB")
    normalized.save(path, format="WEBP", quality=quality, method=6)


def _store_variants(image: Image.Image) -> StoredAlbumImage:
    width, height = image.size
    if width <= 0 or height <= 0 or width * height > MAX_ALBUM_PIXELS:
        raise HTTPException(status_code=400, detail="照片尺寸无效或像素过大")

    token = os.urandom(12).hex()
    display_name = f"album-{token}-display.webp"
    thumbnail_name = f"album-{token}-thumb.webp"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    display_path = os.path.join(settings.UPLOAD_DIR, display_name)
    thumbnail_path = os.path.join(settings.UPLOAD_DIR, thumbnail_name)
    try:
        _save_webp(image, display_path, DISPLAY_MAX_DIM, 88)
        _save_webp(image, thumbnail_path, THUMBNAIL_MAX_DIM, 80)
    except Exception as exc:
        for path in (display_path, thumbnail_path):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
        raise HTTPException(status_code=500, detail="照片处理失败") from exc

    return StoredAlbumImage(
        image_url=f"/uploads/{display_name}",
        thumbnail_url=f"/uploads/{thumbnail_name}",
        width=width,
        height=height,
    )


def store_album_image(contents: bytes, rotation: int = 0) -> StoredAlbumImage:
    if len(contents) > MAX_ALBUM_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="照片不能超过 20 MB")

    try:
        with Image.open(BytesIO(contents)) as source:
            image_format = (source.format or "").upper()
            if image_format not in ALLOWED_ALBUM_FORMATS:
                raise HTTPException(status_code=400, detail="仅支持 HEIC、HEIF、JPEG、PNG 或 WebP 照片")
            frame_count = getattr(source, "n_frames", 1)
            # Mobile browsers can turn an HDR HEIF photo into a .jpeg upload
            # whose primary image and gain map are stored in an MPO container.
            # The first frame is the actual photograph; the extra frame is not
            # animation and can be safely discarded when producing our WebP.
            if frame_count != 1 and image_format != "MPO":
                raise HTTPException(status_code=400, detail="相簿暂不支持动态图片")
            if image_format == "MPO":
                source.seek(0)
            source.load()
            image = ImageOps.exif_transpose(source).copy()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="照片已损坏或格式不受支持") from exc

    if rotation not in (0, 90, 180, 270):
        raise HTTPException(status_code=422, detail="照片旋转角度无效")
    if rotation:
        image = image.rotate(-rotation, expand=True)
    return _store_variants(image)


def _album_path(url: str, required_suffix: str) -> str:
    upload_root = os.path.realpath(settings.UPLOAD_DIR)
    filename = os.path.basename(url)
    path = os.path.realpath(os.path.join(upload_root, filename))
    if (
        os.path.dirname(path) != upload_root
        or not filename.startswith("album-")
        or not filename.endswith(required_suffix)
    ):
        raise HTTPException(status_code=400, detail="照片文件路径无效")
    return path


def rotate_album_image(image_url: str, thumbnail_url: str, degrees: int) -> StoredAlbumImage:
    if degrees not in (-90, 90, 180):
        raise HTTPException(status_code=422, detail="照片旋转角度无效")
    display_path = _album_path(image_url, "-display.webp")
    thumbnail_path = _album_path(thumbnail_url, "-thumb.webp")
    display_temp = f"{display_path}.rotating"
    thumbnail_temp = f"{thumbnail_path}.rotating"
    try:
        with Image.open(display_path) as source:
            source.load()
            rotated = source.rotate(-degrees, expand=True)
            width, height = rotated.size
            _save_webp(rotated, display_temp, DISPLAY_MAX_DIM, 88)
            _save_webp(rotated, thumbnail_temp, THUMBNAIL_MAX_DIM, 80)
        os.replace(display_temp, display_path)
        os.replace(thumbnail_temp, thumbnail_path)
        return StoredAlbumImage(
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            width=width,
            height=height,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="照片文件不存在") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="照片旋转失败") from exc
    finally:
        for path in (display_temp, thumbnail_temp):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass


def remove_album_image_files(*urls: str) -> None:
    upload_root = os.path.realpath(settings.UPLOAD_DIR)
    for url in urls:
        filename = os.path.basename(url)
        if not filename.startswith("album-") or not filename.endswith(".webp"):
            continue
        path = os.path.realpath(os.path.join(upload_root, filename))
        if os.path.dirname(path) != upload_root:
            continue
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
