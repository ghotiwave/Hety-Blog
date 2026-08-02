from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin/comments", tags=["admin-comments"])


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
