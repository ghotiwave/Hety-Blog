import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.digest import NewsDigest
from app.schemas.digest import DigestResponse, PaginatedDigests

router = APIRouter(prefix="/api/digests", tags=["digests"])


@router.get("/archives")
def list_archives(db: Session = Depends(get_db)):
    """Return every month with digests, independent of the paginated feed."""
    month = func.substr(NewsDigest.created_at, 1, 7)
    rows = db.query(month.label("month"), func.count(NewsDigest.id).label("count")).group_by(month).order_by(month.desc()).all()
    return [{"month": row.month, "count": row.count} for row in rows if row.month]


@router.get("", response_model=PaginatedDigests)
def list_digests(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    date: str | None = Query(None, alias="date", description="Filter by date (YYYY-MM or YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    query = db.query(NewsDigest)
    if date:
        query = query.filter(NewsDigest.created_at.contains(date))
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    digests = (
        query.order_by(NewsDigest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        DigestResponse(
            id=d.id,
            title=d.title,
            topic=d.topic,
            content=d.content,
            source_urls=d.source_urls,
            slug=d.slug,
            created_at=d.created_at.isoformat() if d.created_at else "",
        )
        for d in digests
    ]
    return PaginatedDigests(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/latest", response_model=DigestResponse)
def latest_digest(db: Session = Depends(get_db)):
    d = db.query(NewsDigest).order_by(NewsDigest.created_at.desc()).first()
    if not d:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No digests available")
    return DigestResponse(
        id=d.id,
        title=d.title,
        topic=d.topic,
        content=d.content,
        source_urls=d.source_urls,
        created_at=d.created_at.isoformat() if d.created_at else "",
    )


@router.get("/{digest_id}", response_model=DigestResponse)
def get_digest(digest_id: str, db: Session = Depends(get_db)):
    try:
        d = db.query(NewsDigest).get(int(digest_id))
    except ValueError:
        d = db.query(NewsDigest).filter(NewsDigest.slug == digest_id).first()
    if not d:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Digest not found")
    return DigestResponse(
        id=d.id,
        title=d.title,
        topic=d.topic,
        content=d.content,
        source_urls=d.source_urls,
        created_at=d.created_at.isoformat() if d.created_at else "",
    )
