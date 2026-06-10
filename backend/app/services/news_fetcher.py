import json
import requests
from datetime import datetime, timezone, timedelta


AIHOT_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 aihot-skill/0.2.0"
)


def fetch_aihot_selected(since_hours=24):
    """Fetch curated AI news from aihot.virxact.com"""
    try:
        since = (datetime.now(BEIJING_TZ) - timedelta(hours=since_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
        resp = requests.get(
            "https://aihot.virxact.com/api/public/items",
            params={"mode": "selected", "since": since, "take": 30},
            headers={"User-Agent": AIHOT_UA},
            timeout=15,
        )
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            return [
                {
                    "title": item.get("title") or item.get("titleCn") or item.get("titleEn", "Untitled"),
                    "url": item.get("url", ""),
                    "description": item.get("summaryCn") or item.get("summary", ""),
                    "source": f"AI HOT · {item.get('category', 'AI')}",
                }
                for item in items
            ]
        return []
    except Exception:
        return []


def fetch_github_trending():
    try:
        since = (datetime.now(BEIJING_TZ) - timedelta(days=1)).strftime("%Y-%m-%d")
        resp = requests.get(
            "https://api.github.com/search/repositories",
            params={
                "q": f"created:>{since}",
                "sort": "stars",
                "order": "desc",
                "per_page": 10,
            },
            headers={"Accept": "application/vnd.github.v3+json"},
            timeout=15,
        )
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            return [
                {
                    "title": item["full_name"],
                    "url": item["html_url"],
                    "description": item.get("description", "No description"),
                    "source": "GitHub Trending",
                }
                for item in items
            ]
        return []
    except Exception:
        return []


def fetch_hackernews_top():
    try:
        resp = requests.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json",
            timeout=15,
        )
        if resp.status_code == 200:
            ids = resp.json()[:10]
            items = []
            for sid in ids:
                detail = requests.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{sid}.json",
                    timeout=10,
                )
                if detail.status_code == 200:
                    d = detail.json()
                    items.append({
                        "title": d.get("title", "Untitled"),
                        "url": d.get("url", f"https://news.ycombinator.com/item?id={sid}"),
                        "description": f"{d.get('score', 0)} points, {d.get('descendants', 0)} comments",
                        "source": "Hacker News",
                    })
            return items
        return []
    except Exception:
        return []


def fetch_all_news():
    news = []
    news.extend(fetch_aihot_selected(48))
    news.extend(fetch_github_trending())
    news.extend(fetch_hackernews_top())
    return news
