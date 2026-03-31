"""
Layer 3 Tool: fetch_reddit.py
Fetches AI posts from public Reddit JSON endpoints (no auth).
Returns list of Universal News Items.
"""

import sys, io

import json, time, uuid, ssl
import urllib.request
from datetime import datetime, timezone

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "FukanBoard/1.0 (AI news aggregator, personal project)"}

SUBREDDITS = [
    "MachineLearning",
    "artificial",
    "LocalLLaMA",
    "OpenAI",
    "singularity",
    "ChatGPT",
]

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _to_iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

def _truncate(text: str, max_len: int = 280) -> str:
    text = (text or "").strip()
    return text[:277] + "…" if len(text) > max_len else text

def _safe_thumbnail(url: str | None) -> str | None:
    if not url:
        return None
    skip = {"self", "default", "nsfw", "spoiler", "", "image"}
    if url in skip or not url.startswith("http"):
        return None
    return url

def fetch_subreddit(sub: str) -> list[dict]:
    url = f"https://www.reddit.com/r/{sub}/new.json?limit=25"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        _log_error("reddit", sub, str(e))
        return []

    now = _now_utc()
    cutoff = now.timestamp() - 86400
    items = []

    for child in data.get("data", {}).get("children", []):
        post = child.get("data", {})
        created = post.get("created_utc", 0)
        if created < cutoff:
            continue

        title = (post.get("title") or "").strip()
        if not title:
            continue

        # Summary: selftext if available, otherwise URL hint
        selftext = (post.get("selftext") or "").strip()
        summary = _truncate(selftext) if selftext else _truncate(f"Link: {post.get('url', '')}")

        # Source URL: prefer external link, fallback to reddit permalink
        post_url = post.get("url") or ""
        permalink = "https://www.reddit.com" + (post.get("permalink") or "")
        source_url = post_url if post_url.startswith("http") and "reddit.com" not in post_url else permalink

        # Prefer high-res preview image; fall back to thumbnail field
        thumb = _safe_thumbnail(post.get("thumbnail"))
        try:
            preview_url = post["preview"]["images"][0]["source"]["url"]
            # Reddit HTML-encodes & in preview URLs
            preview_url = preview_url.replace("&amp;", "&")
            if preview_url.startswith("http"):
                thumb = preview_url
        except (KeyError, IndexError, TypeError):
            pass

        items.append({
            "id": uuid.uuid4().hex,
            "source_type": "reddit",
            "source_name": f"Reddit r/{sub}",
            "source_url": source_url,
            "author": post.get("author"),
            "title": title,
            "summary": summary,
            "thumbnail_url": thumb,
            "published_at": _to_iso(created),
            "fetched_at": now.isoformat(),
            "tags": ["reddit", sub.lower()],
            "engagement": {
                "likes": post.get("score", 0),
                "reposts": post.get("num_crossposts", 0),
                "saves": 0,
            },
            "raw_metadata": {
                "subreddit": sub,
                "score": post.get("score"),
                "num_comments": post.get("num_comments"),
                "upvote_ratio": post.get("upvote_ratio"),
                "permalink": permalink,
            },
        })

    return items


def fetch_reddit() -> list[dict]:
    all_items = []
    for sub in SUBREDDITS:
        all_items.extend(fetch_subreddit(sub))
        time.sleep(0.5)  # polite rate limiting
    return all_items


def _log_error(source: str, detail: str, error: str):
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/errors.log", "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": source,
            "detail": detail,
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    results = fetch_reddit()
    print(f"Reddit: {len(results)} items fetched")
    for r in results[:3]:
        print(f"  [{r['source_name']}] {r['title'][:80]}")
