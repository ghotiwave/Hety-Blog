import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.like import Like
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate, PostResponse, PostListItem, PaginatedPosts
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin/posts", tags=["admin-posts"])


@router.get("", response_model=PaginatedPosts)
def list_all_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total = db.query(Post).count()
    total_pages = max(1, math.ceil(total / page_size))
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
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
def get_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.query(Post).get(post_id)
    if not post:
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


@router.post("", response_model=PostResponse, status_code=201)
def create_post(req: PostCreate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = Post(**req.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
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
        like_count=0,
        view_count=0,
        comment_count=0,
    )


@router.put("/{post_id}", response_model=PostResponse)
def update_post(post_id: int, req: PostUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.query(Post).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
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


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.query(Post).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
