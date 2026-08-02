from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
import os
import io
from PIL import Image, ImageOps
from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])

MAX_DIM = 1920
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "GIF", "WEBP"}


def store_image_bytes(original_filename: str, contents: bytes) -> str:
    ext = (original_filename or "png").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="图片不能超过 10 MB")

    try:
        with Image.open(io.BytesIO(contents)) as probe:
            image_format = (probe.format or "").upper()
            probe.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="图片文件已损坏或格式不受支持") from exc
    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(status_code=400, detail="图片文件格式不受支持")

    # Keep animated GIFs intact. Normalize still images after applying EXIF orientation.
    if image_format == "GIF":
        ext = "gif"
    else:
        try:
            with Image.open(io.BytesIO(contents)) as source:
                img = ImageOps.exif_transpose(source)
                if max(img.size) > MAX_DIM:
                    img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)

                has_alpha = img.mode in ("RGBA", "LA") or (
                    img.mode == "P" and "transparency" in img.info
                )
                out = io.BytesIO()
                if has_alpha:
                    img.convert("RGBA").save(out, format="WEBP", quality=85, method=6)
                    ext = "webp"
                else:
                    img.convert("RGB").save(out, format="JPEG", optimize=True, quality=85)
                    ext = "jpg"
                contents = out.getvalue()
        except Exception as exc:
            raise HTTPException(status_code=400, detail="图片处理失败") from exc

    filename = f"{os.urandom(8).hex()}.{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return f"/uploads/{filename}"


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), _: User = Depends(get_current_user)):
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    return {"url": store_image_bytes(file.filename or "image.png", contents)}
