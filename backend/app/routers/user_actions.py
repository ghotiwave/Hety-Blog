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
from app.utils.timestamps import beijing_isoformat

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
    visible_history = (
        db.query(
            subq.c.post_id,
            subq.c.last_visit,
            Post.slug,
            Post.title,
        )
        .join(Post, Post.id == subq.c.post_id)
        .filter(Post.published == True)
    )
    total = visible_history.count()
    rows = (
        visible_history
        .order_by(desc(subq.c.last_visit))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for row in rows:
        items.append({
            "post_id": row.post_id,
            "slug": row.slug,
            "title": row.title,
            "visited_at": beijing_isoformat(row.last_visit),
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/user/likes")
def liked_posts(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    visible_likes = (
        db.query(Like)
        .join(Post, Post.id == Like.post_id)
        .filter(Like.user_id == user.id, Post.published == True)
    )
    total = visible_likes.count()
    rows = (
        visible_likes
        .order_by(desc(Like.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for r in rows:
        p = r.post
        items.append({
            "post_id": p.id,
            "slug": p.slug,
            "title": p.title,
            "created_at": beijing_isoformat(r.created_at),
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}
