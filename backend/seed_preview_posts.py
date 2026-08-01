import sqlite3
from datetime import datetime


db = sqlite3.connect("data/blog.db")
rows = [
    ("从模型能力到真实产品：AI 应用该如何被评价", "当技术迭代越来越快，真正决定体验的往往是界面、反馈和人的注意力。", "AI,产品", "preview-ai-product"),
    ("给个人网站留一点可以慢下来的空间", "用更少的视觉噪声，给文章、评论和持续的思考留下位置。", "设计,随笔", "preview-personal-space"),
    ("我如何整理每天收到的科技新闻", "自动汇总不是终点；可读、可追溯、可回看的日报才有价值。", "日报,工作流", "preview-digest-workflow"),
]
now = datetime.now().isoformat(sep=" ")
db.executemany(
    """INSERT OR IGNORE INTO posts
    (title, summary, content, tags, slug, post_type, published, view_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'blog', 1, 0, ?, ?)""",
    [(title, summary, "本地界面预览测试文章。", tags, slug, now, now) for title, summary, tags, slug in rows],
)
db.commit()
count = db.execute("SELECT count(1) FROM posts WHERE slug LIKE 'preview-%'").fetchone()[0]
db.close()
print(f"preview posts ready: {count}")
