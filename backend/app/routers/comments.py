from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/posts", tags=["comments"])


def _serialize(c, db: Session):
    username = None
    avatar_url = None
    if c.user_id:
        user = db.query(User).filter(User.id == c.user_id).first()
        if user:
            username = user.username
            avatar_url = user.avatar_url
    return CommentResponse(
        id=c.id,
        post_id=c.post_id,
        author_name=username or "anonymous",
        content=c.content,
        avatar_url=avatar_url,
        created_at=c.created_at.isoformat() if c.created_at else "",
    )


@router.get("/{post_id}/comments", response_model=list[CommentResponse])
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [_serialize(c, db) for c in comments]


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(
    post_id: int,
    req: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id, Post.published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not req.content.strip():
        raise HTTPException(status_code=422, detail="Content required")
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=req.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _serialize(comment, db)
