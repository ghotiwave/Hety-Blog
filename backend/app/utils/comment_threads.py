from sqlalchemy.orm import Session

from app.models.comment import Comment, CommentLike


def delete_comment_thread(db: Session, comment: Comment) -> None:
    """Delete a comment and, for a root comment, every visible reply beneath it."""
    child_ids = []
    if comment.parent_id is None:
        child_ids = [
            row[0]
            for row in db.query(Comment.id).filter(Comment.parent_id == comment.id).all()
        ]

    target_ids = [comment.id, *child_ids]
    db.query(CommentLike).filter(CommentLike.comment_id.in_(target_ids)).delete(
        synchronize_session=False
    )
    if child_ids:
        db.query(Comment).filter(Comment.id.in_(child_ids)).delete(
            synchronize_session=False
        )
    db.delete(comment)
