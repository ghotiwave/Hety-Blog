"""User actions: view, like, reading history, liked posts."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.user import User
from app.models.post import Post
from app.models.like import Like
from app.models.reading_history import ReadingHistory
from app.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["user-actions"])


@router.post("/posts/{post_id}/view")
def record_view(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.view_count = (post.view_count or 0) + 1

    existing = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id, ReadingHistory.post_id == post_id)
        .first()
    )
    if existing:
        existing.visited_at = func.now()
    else:
        db.add(ReadingHistory(user_id=user.id, post_id=post_id))

    db.commit()
    return {"view_count": post.view_count}


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.user_id == user.id, Like.post_id == post_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        db.add(Like(user_id=user.id, post_id=post_id))
        db.commit()
        liked = True

    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post_id).scalar()
    return {"liked": liked, "like_count": like_count}


@router.get("/user/history")
def reading_history(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Deduplicate: show only the latest visit per post
    subq = (
        db.query(
            ReadingHistory.post_id,
            func.max(ReadingHistory.visited_at).label("last_visit"),
        )
        .filter(ReadingHistory.user_id == user.id)
        .group_by(ReadingHistory.post_id)
        .subquery()
    )
    total = db.query(subq).count()
    rows = (
        db.query(subq)
        .order_by(desc(subq.c.last_visit))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for row in rows:
        p = db.query(Post).filter(Post.id == row.post_id, Post.published == True).first()
        if p:
            items.append({
                "post_id": p.id,
                "title": p.title,
                "visited_at": row.last_visit.isoformat() if row.last_visit else "",
            })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/user/likes")
def liked_posts(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.query(Like).filter(Like.user_id == user.id).count()
    rows = (
        db.query(Like)
        .filter(Like.user_id == user.id)
        .order_by(desc(Like.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for r in rows:
        p = r.post
        if p and p.published:
            items.append({
                "post_id": p.id,
                "title": p.title,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            })
    return {"items": items, "total": total, "page": page, "page_size": page_size}
