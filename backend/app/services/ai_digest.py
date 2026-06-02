import json
from datetime import datetime, timezone
from openai import OpenAI
from sqlalchemy.orm import Session
from app.config import settings
from app.models.digest import NewsDigest
from app.services.news_fetcher import fetch_all_news


def generate_daily_digest(db: Session) -> NewsDigest:
    news_items = fetch_all_news()

    if not news_items:
        raise Exception("No news items fetched from any source")

    news_text = "\n".join(
        f"- [{item['title']}]({item['url']}) [{item['source']}]\n  {item['description']}"
        for item in news_items
    )

    prompt = f"""你是一个专业的技术日报编辑。以下是今天从多个来源抓取的技术新闻和开源项目动态。
请用中文整理成一份结构清晰的技术日报。

要求：
1. 给日报起一个标题，格式为"技术日报 - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
2. 按类别分组（如：AI/大模型、前端/工具、开源项目、综合资讯等）
3. 每条新闻用 2-3 句话总结要点
4. 标注特别值得关注的项目（🔥）
5. 用 Markdown 格式输出，有清晰的标题层级
6. **每条新闻后面必须单独一行写上原文链接，格式为 `> 原文：[链接文本](URL)`**

以下是新闻列表：

{news_text}"""

    client = OpenAI(
        base_url=settings.DEEPSEEK_BASE_URL,
        api_key=settings.DEEPSEEK_API_KEY,
    )

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "你是一个专业的技术日报编辑，用中文撰写内容。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=4000,
    )

    content = resp.choices[0].message.content

    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    digest = NewsDigest(
        title=f"技术日报 - {today_str}",
        topic="综合",
        content=content,
        source_urls=json.dumps([item["url"] for item in news_items]),
    )
    db.add(digest)
    db.flush()

    # Also create a blog post with auto-tags
    from app.models.post import Post
    existing = db.query(Post).filter(Post.title == f"AI技术日报 - {today_str}").first()
    if not existing:
        blog_post = Post(
            title=f"AI技术日报 - {today_str}",
            content=content,
            summary=f"每日 AI 技术新闻总结，涵盖行业动态、模型发布、开源项目等。",
            tags="#AI日报,#tech,#aigc",
            published=True,
        )
        db.add(blog_post)

    db.commit()
    db.refresh(digest)
    return digest
