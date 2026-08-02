from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.digest import NewsDigest


def _base_slug(digest: NewsDigest) -> str:
    if digest.slug and digest.slug.strip():
        return digest.slug.strip()
    if digest.created_at:
        return digest.created_at.strftime("%Y-%m-%d")
    return f"digest-{digest.id}"


def assign_unique_digest_slugs(digests: Iterable[NewsDigest]) -> int:
    """Repair duplicate/missing slugs in-place while preserving canonical recent URLs."""
    ordered = sorted(
        digests,
        key=lambda digest: (digest.created_at or datetime.min, digest.id or 0),
        reverse=True,
    )
    reserved = {digest.slug.strip() for digest in ordered if digest.slug and digest.slug.strip()}
    used: set[str] = set()
    changed = 0

    for digest in ordered:
        base = _base_slug(digest)
        candidate = base
        suffix = 2
        while candidate in used or (candidate in reserved and candidate != digest.slug):
            candidate = f"{base}-{suffix}"
            suffix += 1
        if digest.slug != candidate:
            digest.slug = candidate
            changed += 1
        used.add(candidate)
        reserved.add(candidate)

    return changed


def repair_digest_slugs(db: Session) -> int:
    digests = db.query(NewsDigest).all()
    changed = assign_unique_digest_slugs(digests)
    if changed:
        db.commit()
    return changed


def next_digest_slug(db: Session, date_slug: str) -> str:
    candidate = date_slug
    suffix = 2
    while db.query(NewsDigest.id).filter(NewsDigest.slug == candidate).first():
        candidate = f"{date_slug}-{suffix}"
        suffix += 1
    return candidate
