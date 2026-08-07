import secrets
import string
from collections.abc import Iterable

from sqlalchemy.orm import Session


POST_SLUG_LENGTH = 12
POST_SLUG_ALPHABET = string.ascii_lowercase + string.digits


def random_post_slug() -> str:
    return secrets.choice(string.ascii_lowercase) + "".join(
        secrets.choice(POST_SLUG_ALPHABET) for _ in range(POST_SLUG_LENGTH - 1)
    )


def assign_missing_post_slugs(posts: Iterable[object]) -> int:
    post_list = list(posts)
    used = {
        str(post.slug).strip()
        for post in post_list
        if getattr(post, "slug", None) and not str(post.slug).strip().isdigit()
    }
    changed = 0

    for post in sorted(post_list, key=lambda item: getattr(item, "id", 0) or 0):
        current = str(post.slug).strip() if getattr(post, "slug", None) else ""
        if current and not current.isdigit():
            continue
        candidate = random_post_slug()
        while candidate in used:
            candidate = random_post_slug()
        post.slug = candidate
        used.add(candidate)
        changed += 1

    return changed


def repair_post_slugs(db: Session) -> int:
    from app.models.post import Post

    return assign_missing_post_slugs(db.query(Post).all())
