from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment, CommentLike
from app.utils.comment_threads import delete_comment_thread
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.dependencies import get_current_user, get_optional_user
from app.utils.timestamps import beijing_isoformat
from app.services.turnstile import require_turnstile
from app.utils.guest_comments import (
    consume_guest_comment_limit,
    default_guest_name,
    guest_key_hash,
    resolve_guest_identity,
    set_guest_identity_cookie,
)
from app.utils.request_ip import client_ip

router = APIRouter(prefix="/api/posts", tags=["comments"])


def _serialize(c, db: Session, current_user_id: int | None = None):
    user = db.query(User).filter(User.id == c.user_id).first() if c.user_id else None
    reply_user = db.query(User).filter(User.id == c.reply_to_user_id).first() if c.reply_to_user_id else None

    # Check if current user liked this
    user_liked = False
    if current_user_id:
        ul = db.query(CommentLike).filter(
            CommentLike.user_id == current_user_id,
            CommentLike.comment_id == c.id,
        ).first()
        user_liked = bool(ul and ul.liked == 1)

    return {
        "id": c.id,
        "post_id": c.post_id,
        "parent_id": c.parent_id,
        "content": c.content,
        "user_id": user.id if user else None,
        "author_name": user.username if user else (c.guest_name or "anonymous"),
        "author_role": user.role if user else ("guest" if c.guest_name else None),
        "avatar_url": user.avatar_url if user else None,
        "signature": user.signature if user else None,
        "reply_to_name": reply_user.username if reply_user else c.reply_to_name_override,
        "like_count": c.like_count or 0,
        "user_liked": user_liked,
        "reply_count": db.query(func.count(Comment.id)).filter(Comment.parent_id == c.id).scalar() or 0,
        "created_at": beijing_isoformat(c.created_at),
    }


@router.get("/{post_id}/comments")
def list_comments(
    post_id: int,
    sort: str = Query("time", alias="sort"),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get root comments
    order = Comment.created_at.desc() if sort == "time" else Comment.like_count.desc()
    roots = (
        db.query(Comment)
        .filter(Comment.post_id == post_id, Comment.parent_id == None)
        .order_by(order)
        .offset((page - 1) * 10)
        .limit(10)
        .all()
    )

    result = []
    for root in roots:
        item = _serialize(root, db, current_user.id if current_user else None)
        # Top 3 replies
        replies = (
            db.query(Comment)
            .filter(Comment.parent_id == root.id)
            .order_by(Comment.created_at.asc())
            .limit(3)
            .all()
        )
        item["replies"] = [_serialize(r, db, current_user.id if current_user else None) for r in replies]
        result.append(item)

    total_roots = db.query(func.count(Comment.id)).filter(
        Comment.post_id == post_id, Comment.parent_id == None
    ).scalar() or 0

    return {"items": result, "total": total_roots, "page": page}


@router.get("/{post_id}/comments/{comment_id}/replies")
def list_replies(
    post_id: int,
    comment_id: int,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    parent = (
        db.query(Comment)
        .join(Post, Post.id == Comment.post_id)
        .filter(
            Comment.id == comment_id,
            Comment.post_id == post_id,
            Post.published == True,
        )
        .first()
    )
    if not parent:
        raise HTTPException(status_code=404, detail="Comment not found")

    total = db.query(func.count(Comment.id)).filter(
        Comment.parent_id == comment_id,
        Comment.post_id == post_id,
    ).scalar() or 0
    replies = (
        db.query(Comment)
        .filter(Comment.parent_id == comment_id, Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .offset((page - 1) * 20)
        .limit(20)
        .all()
    )
    return {
        "items": [_serialize(r, db, current_user.id if current_user else None) for r in replies],
        "total": total,
        "page": page,
    }


@router.post("/{post_id}/comments")
async def create_comment(
    post_id: int,
    req: CommentCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not req.content.strip():
        raise HTTPException(status_code=422, detail="Content required")

    # Validate parent and reply_to — derive reply_to_user_id from parent comment
    parent_id = None
    reply_to_user_id = None
    reply_to_name_override = None
    if req.parent_id:
        parent = db.query(Comment).filter(Comment.id == req.parent_id, Comment.post_id == post_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        reply_to_user_id = parent.user_id
        if parent.user_id is None:
            reply_to_name_override = parent.guest_name or "anonymous"
        # If replying to a reply, parent is the root
        if parent.parent_id:
            parent_id = parent.parent_id
        else:
            parent_id = parent.id

    guest_id = None
    guest_name = None
    guest_email = None
    identity_hash = None
    if current_user is None:
        guest_id = resolve_guest_identity(request)
        identity_hash = guest_key_hash(guest_id)
        consume_guest_comment_limit(client_ip(request), identity_hash)
        await require_turnstile(req.turnstile_token, client_ip(request))
        guest_name = req.guest_name or default_guest_name(guest_id)
        guest_email = req.guest_email

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id if current_user else None,
        parent_id=parent_id,
        reply_to_user_id=reply_to_user_id,
        reply_to_name_override=reply_to_name_override,
        guest_name=guest_name,
        guest_email=guest_email,
        guest_key_hash=identity_hash,
        content=req.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    if guest_id:
        set_guest_identity_cookie(response, guest_id)
    return _serialize(comment, db, current_user.id if current_user else None)


@router.post("/{post_id}/comments/{comment_id}/like")
def toggle_comment_like(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing = db.query(CommentLike).filter(
        CommentLike.user_id == current_user.id,
        CommentLike.comment_id == comment_id,
    ).first()

    if existing:
        db.delete(existing)
        comment.like_count = max(0, (comment.like_count or 0) - 1)
    else:
        db.add(CommentLike(user_id=current_user.id, comment_id=comment_id))
        comment.like_count = (comment.like_count or 0) + 1

    db.commit()
    return {"liked": existing is None, "like_count": comment.like_count}


@router.delete("/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Not found")
    if current_user.role != "admin" and comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    delete_comment_thread(db, comment)
    db.commit()
    return {"message": "deleted"}
