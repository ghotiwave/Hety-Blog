"""
Blog MCP Server — exposes blog management as tools for Claude Code / Cursor.
Run: python -m app.mcp_server
"""

import json
from mcp.server.fastmcp import FastMCP
from app.database import SessionLocal, init_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.profile import Profile
from app.models.user import User
from app.models.score import Score
from app.models.digest import NewsDigest
from app.services.ai_digest import generate_daily_digest

mcp = FastMCP("Blog Manager")


def _db():
    return SessionLocal()


# ─── Posts ──────────────────────────────────────────────

@mcp.tool()
def list_posts(page: int = 1, page_size: int = 10) -> str:
    """列出所有文章（含草稿），支持分页。"""
    db = _db()
    try:
        total = db.query(Post).count()
        posts = (
            db.query(Post)
            .order_by(Post.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        result = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "posts": [
                {
                    "id": p.id,
                    "title": p.title,
                    "summary": p.summary,
                    "published": p.published,
                    "created_at": p.created_at.isoformat() if p.created_at else "",
                }
                for p in posts
            ],
        }
        return json.dumps(result, ensure_ascii=False, indent=2)
    finally:
        db.close()


@mcp.tool()
def get_post(post_id: int) -> str:
    """获取单篇文章的完整内容。"""
    db = _db()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return json.dumps({"error": "Post not found"})
        return json.dumps(
            {
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "summary": post.summary,
                "published": post.published,
                "cover_image": post.cover_image,
                "created_at": post.created_at.isoformat() if post.created_at else "",
                "updated_at": post.updated_at.isoformat() if post.updated_at else "",
            },
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


@mcp.tool()
def create_post(title: str, content: str, summary: str = "", published: bool = False) -> str:
    """创建新文章。content 支持 Markdown 格式。"""
    db = _db()
    try:
        post = Post(
            title=title,
            content=content,
            summary=summary or content[:200],
            published=published,
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        return json.dumps({"message": "Post created", "id": post.id, "title": post.title})
    finally:
        db.close()


@mcp.tool()
def update_post(post_id: int, title: str = "", content: str = "", summary: str = "", published: bool = None) -> str:
    """更新文章。只传需要修改的字段。"""
    db = _db()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return json.dumps({"error": "Post not found"})
        if title:
            post.title = title
        if content:
            post.content = content
        if summary:
            post.summary = summary
        if published is not None:
            post.published = published
        db.commit()
        return json.dumps({"message": "Post updated", "id": post.id})
    finally:
        db.close()


@mcp.tool()
def delete_post(post_id: int) -> str:
    """删除文章及其所有评论。"""
    db = _db()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return json.dumps({"error": "Post not found"})
        db.delete(post)
        db.commit()
        return json.dumps({"message": "Post deleted", "id": post_id})
    finally:
        db.close()


# ─── Comments ───────────────────────────────────────────

@mcp.tool()
def list_comments(post_id: int) -> str:
    """查看某篇文章的所有评论。"""
    db = _db()
    try:
        comments = (
            db.query(Comment)
            .filter(Comment.post_id == post_id)
            .order_by(Comment.created_at.asc())
            .all()
        )
        return json.dumps(
            [
                {"id": c.id, "author_name": c.author_name, "content": c.content,
                 "created_at": c.created_at.isoformat() if c.created_at else ""}
                for c in comments
            ],
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


@mcp.tool()
def delete_comment(comment_id: int) -> str:
    """删除一条评论。"""
    db = _db()
    try:
        comment = db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            return json.dumps({"error": "Comment not found"})
        db.delete(comment)
        db.commit()
        return json.dumps({"message": "Comment deleted", "id": comment_id})
    finally:
        db.close()


# ─── Stats ──────────────────────────────────────────────

@mcp.tool()
def get_stats() -> str:
    """获取博客统计数据：文章数、评论数、用户数。"""
    db = _db()
    try:
        return json.dumps(
            {
                "total_posts": db.query(Post).count(),
                "published_posts": db.query(Post).filter(Post.published == True).count(),
                "total_comments": db.query(Comment).count(),
                "total_users": db.query(User).count(),
            },
            indent=2,
        )
    finally:
        db.close()


# ─── Profile ────────────────────────────────────────────

@mcp.tool()
def get_profile() -> str:
    """获取站长个人信息。"""
    db = _db()
    try:
        p = db.query(Profile).first()
        if not p:
            return json.dumps({"error": "Profile not found"})
        return json.dumps(
            {
                "name": p.name,
                "bio": p.bio,
                "interests": p.interests,
                "experience": p.experience,
                "github_url": p.github_url,
                "twitter_url": p.twitter_url,
            },
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


@mcp.tool()
def update_profile(name: str = "", bio: str = "", interests: str = "", experience: str = "",
                   github_url: str = "", twitter_url: str = "") -> str:
    """更新站长个人信息。只传需要修改的字段。"""
    db = _db()
    try:
        p = db.query(Profile).first()
        if not p:
            p = Profile(id=1)
            db.add(p)
        if name: p.name = name
        if bio: p.bio = bio
        if interests: p.interests = interests
        if experience: p.experience = experience
        if github_url: p.github_url = github_url
        if twitter_url: p.twitter_url = twitter_url
        db.commit()
        return json.dumps({"message": "Profile updated"})
    finally:
        db.close()


# ─── Leaderboard ────────────────────────────────────────

@mcp.tool()
def get_leaderboard(limit: int = 10) -> str:
    """查看游戏排行榜。"""
    db = _db()
    try:
        scores = (
            db.query(Score)
            .order_by(Score.score.desc())
            .limit(limit)
            .all()
        )
        return json.dumps(
            [
                {"rank": i + 1, "username": s.user.username if s.user else "?", "score": s.score,
                 "played_at": s.played_at.isoformat() if s.played_at else ""}
                for i, s in enumerate(scores)
            ],
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


# ─── AI Digest ──────────────────────────────────────────

@mcp.tool()
def list_digests(page: int = 1, page_size: int = 5) -> str:
    """列出 AI 日报。"""
    db = _db()
    try:
        total = db.query(NewsDigest).count()
        digests = (
            db.query(NewsDigest)
            .order_by(NewsDigest.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return json.dumps(
            {
                "total": total,
                "digests": [
                    {"id": d.id, "title": d.title, "topic": d.topic,
                     "created_at": d.created_at.isoformat() if d.created_at else ""}
                    for d in digests
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


@mcp.tool()
def get_digest(digest_id: int) -> str:
    """获取单期 AI 日报完整内容。"""
    db = _db()
    try:
        d = db.query(NewsDigest).filter(NewsDigest.id == digest_id).first()
        if not d:
            return json.dumps({"error": "Digest not found"})
        return json.dumps(
            {"id": d.id, "title": d.title, "topic": d.topic, "content": d.content,
             "created_at": d.created_at.isoformat() if d.created_at else ""},
            ensure_ascii=False,
            indent=2,
        )
    finally:
        db.close()


@mcp.tool()
def generate_digest() -> str:
    """手动触发生成一期新的 AI 日报。"""
    db = _db()
    try:
        digest = generate_daily_digest(db)
        return json.dumps({"message": "Digest generated", "id": digest.id, "title": digest.title})
    except Exception as e:
        return json.dumps({"error": str(e)})
    finally:
        db.close()


# ─── Entry ──────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    mcp.run()
