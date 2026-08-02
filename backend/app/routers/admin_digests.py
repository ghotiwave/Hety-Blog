import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_admin
from app.services.ai_digest import generate_daily_digest

router = APIRouter(prefix="/api/admin/digests", tags=["admin-digests"])
logger = logging.getLogger(__name__)


@router.post("/generate")
def trigger_digest(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    try:
        digest = generate_daily_digest(db)
        return {"message": "Digest generated", "id": digest.id, "title": digest.title}
    except Exception:
        from fastapi import HTTPException
        logger.exception("Manual daily digest generation failed")
        raise HTTPException(status_code=500, detail="日报生成失败，请查看服务端日志")
