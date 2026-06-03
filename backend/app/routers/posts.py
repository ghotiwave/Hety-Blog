import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.like import Like
from app.schemas.post import PostResponse, PostListItem, PaginatedPosts

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=PaginatedPosts)
def list_posts(
    q: str | None = Query(None, alias="q"),
    tag: str | None = Query(None, alias="tag"),
    post_type: str | None = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = db.query(Post).filter(Post.published == True)
    if q:
        query = query.filter(
            Post.title.contains(q) | Post.content.contains(q)
        )
    if tag:
        query = query.filter(Post.tags.contains(tag))
    if post_type:
        query = query.filter(Post.post_type == post_type)
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    posts = (
        query.order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for p in posts:
        comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == p.id).scalar()
        like_count = db.query(func.count(Like.id)).filter(Like.post_id == p.id).scalar()
        items.append(
            PostListItem(
                id=p.id,
                title=p.title,
                summary=p.summary,
                cover_image=p.cover_image,
                tags=p.tags,
                published=p.published,
                created_at=p.created_at.isoformat() if p.created_at else "",
                like_count=like_count or 0,
                view_count=p.view_count or 0,
                comment_count=comment_count or 0,
            )
        )
    return PaginatedPosts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Post not found")
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar()
    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        summary=post.summary,
        cover_image=post.cover_image,
        tags=post.tags,
        published=post.published,
        created_at=post.created_at.isoformat() if post.created_at else "",
        updated_at=post.updated_at.isoformat() if post.updated_at else "",
        like_count=like_count or 0,
        view_count=post.view_count or 0,
        comment_count=comment_count or 0,
    )
