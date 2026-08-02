from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.score import Score
from app.models.user import User
from app.schemas.score import ScoreSubmit, ScoreResponse, LeaderboardResponse
from app.dependencies import get_current_user
from app.utils.timestamps import beijing_isoformat

router = APIRouter(prefix="/api/scores", tags=["scores"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
def leaderboard(db: Session = Depends(get_db)):
    # Get only the highest score per user
    subq = (
        db.query(Score.user_id, func.max(Score.score).label("max_score"))
        .group_by(Score.user_id)
        .subquery()
    )
    rows = (
        db.query(Score, User.username)
        .join(User, Score.user_id == User.id)
        .join(subq, (Score.user_id == subq.c.user_id) & (Score.score == subq.c.max_score))
        .order_by(Score.score.desc())
        .limit(20)
        .all()
    )
    leaderboard = [
        ScoreResponse(
            id=s.id,
            username=username,
            score=s.score,
            played_at=beijing_isoformat(s.played_at),
        )
        for s, username in rows
    ]
    return LeaderboardResponse(leaderboard=leaderboard)


@router.post("", response_model=ScoreResponse, status_code=201)
def submit_score(
    req: ScoreSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only save if this beats the user's personal best
    existing_best = (
        db.query(func.max(Score.score))
        .filter(Score.user_id == current_user.id)
        .scalar()
    )
    if existing_best is not None and req.score <= existing_best:
        raise HTTPException(status_code=200, detail="score not higher than personal best")

    score = Score(user_id=current_user.id, score=req.score)
    db.add(score)
    db.commit()
    db.refresh(score)
    return ScoreResponse(
        id=score.id,
        username=current_user.username,
        score=score.score,
        played_at=beijing_isoformat(score.played_at),
    )
