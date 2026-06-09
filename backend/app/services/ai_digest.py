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

## 严格要求（必须遵守）

1. 日报第一行为 `# 技术日报 - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}`

2. 用 `##` 标题分类（如 `## AI/大模型`、`## 前端/工具`、`## 开源项目`、`## 综合资讯`）

3. **🔥 特别关注** 独立为 `## 🔥 今日特别关注` 板块，放最重要的 3-5 条新闻

4. **每条新闻必须严格使用以下格式**：
```
- **新闻标题**：2-3 句话内容摘要
> 原文：[简短来源名](完整URL)
```
示例：
```
- **OpenAI 发布 GPT-5**：OpenAI 今日正式发布 GPT-5 模型，在推理能力和多模态方面取得重大突破，多项基准测试超越前代模型。
> 原文：[OpenAI Blog](https://openai.com/blog/gpt-5)
```

5. 每个 `##` 板块内如需分子类，用 `### 子类名` 标题，其下同样使用 `- **标题**：描述` 格式

6. 每条新闻必须有 `> 原文：` 链接行，紧跟在描述行之后，不得省略

7. **禁止使用 `####` 或更深标题**，禁止将新闻标题写成标题行（如 `### 新闻标题`），必须用列表格式

以下是新闻列表：

{news_text}"""

    client = OpenAI(
        base_url=settings.AI_BASE_URL,
        api_key=settings.AI_API_KEY,
    )

    # DeepSeek V4 models default to thinking mode, which consumes token budget.
    # Disable thinking for summarization tasks where we only need the final output.
    api_kwargs = dict(
        model=settings.AI_MODEL,
        messages=[
            {"role": "system", "content": "你是一个专业的技术日报编辑，用中文撰写内容。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=8000,
    )
    if "deepseek" in settings.AI_BASE_URL and ("v4" in settings.AI_MODEL.lower() or "deepseek-v4" in settings.AI_MODEL.lower()):
        api_kwargs["extra_body"] = {"thinking": {"type": "disabled"}}

    resp = client.chat.completions.create(**api_kwargs)

    content = resp.choices[0].message.content
    if not content or not content.strip():
        finish = resp.choices[0].finish_reason
        raise Exception(f"AI 返回空内容 (finish_reason={finish})，请检查模型名 '{settings.AI_MODEL}' 是否正确")

    now = datetime.now(timezone.utc)
    today_str = now.strftime('%Y-%m-%d')
    # Check for existing digests today to avoid slug conflict
    existing = db.query(NewsDigest).filter(NewsDigest.slug.like(f'{today_str}%')).count()
    slug = today_str if existing == 0 else f'{today_str}-{existing + 1}'
    digest = NewsDigest(
        title=f"技术日报 - {today_str}",
        topic="综合",
        content=content,
        source_urls=json.dumps([item["url"] for item in news_items]),
        slug=slug,
    )
    db.add(digest)
    db.commit()
    db.refresh(digest)
    return digest
