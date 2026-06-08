from fastapi import APIRouter, HTTPException, UploadFile, File
import os
import io
from PIL import Image
from app.config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])

MAX_AVATAR_KB = 200
MAX_DIM = 800


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = (file.filename or "png").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    contents = await file.read()

    # Always compress and resize to keep avatars small
    if ext in ("jpg", "jpeg", "png", "webp"):
        try:
            img = Image.open(io.BytesIO(contents))
            img = img.convert("RGBA") if img.mode in ("RGBA", "P") else img.convert("RGB")
            # Resize large images
            if max(img.size) > MAX_DIM:
                img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
            # Always save as optimized JPEG for consistent small size
            out = io.BytesIO()
            img.convert("RGB").save(out, format="JPEG", optimize=True, quality=80)
            contents = out.getvalue()
            ext = "jpg"
        except Exception as e:
            print(f"Image compression failed: {e}")

    filename = f"{os.urandom(8).hex()}.{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/{filename}"}
