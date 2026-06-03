from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.user import User
from app.models.like import Like
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return {
        "total_posts": db.query(func.count(Post.id)).scalar() or 0,
        "published_posts": db.query(func.count(Post.id)).filter(Post.published == True).scalar() or 0,
        "total_comments": db.query(func.count(Comment.id)).scalar() or 0,
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "total_likes": db.query(func.count(Like.id)).scalar() or 0,
        "total_views": db.query(func.sum(Post.view_count)).scalar() or 0,
    }


@router.get("/comments")
def list_comments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total = db.query(func.count(Comment.id)).scalar() or 0
    rows = (
        db.query(Comment)
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for c in rows:
        post = db.query(Post).filter(Post.id == c.post_id).first()
        user = db.query(User).filter(User.id == c.user_id).first() if c.user_id else None
        items.append({
            "id": c.id,
            "post_id": c.post_id,
            "post_title": post.title if post else "(deleted)",
            "author_name": user.username if user else "anonymous",
            "content": c.content,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(c)
    db.commit()
    return {"message": "deleted"}


@router.get("/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else ""} for u in users]


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Not found")
    if u.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin")
    db.delete(u)
    db.commit()
    return {"message": "deleted"}
