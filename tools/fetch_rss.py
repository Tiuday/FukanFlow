"""
Layer 3 Tool: fetch_rss.py
Fetches articles from RSS feeds (TechCrunch, VentureBeat, MIT, Verge, Wired, ToI).
Returns list of Universal News Items.
"""

import sys, io

import json, re, time, uuid, ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "FukanBoard/1.0"}

RSS_SOURCES = [
    {"name": "TechCrunch",      "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "filter_ai": False},
    {"name": "VentureBeat",     "url": "https://venturebeat.com/category/ai/feed/",                    "filter_ai": False},
    {"name": "MIT Tech Review", "url": "https://www.technologyreview.com/feed/",                        "filter_ai": True},
    {"name": "The Verge",       "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "filter_ai": False},
    {"name": "Wired",           "url": "https://www.wired.com/feed/rss",                               "filter_ai": True},
    {"name": "Times of India",  "url": "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms",      "filter_ai": True},
]

AI_KEYWORDS = [
    "artificial intelligence", " ai ", " ai,", " ai.", "machine learning",
    "large language model", "llm", "chatgpt", "claude", "gemini", "gpt",
    "neural network", "deep learning", "openai", "anthropic", "google deepmind",
    "diffusion model", "generative ai", "transformer", "ai model", "ai tool",
    "ai agent", "ai startup", "ai research",
]

# XML namespaces commonly used in RSS
NS_MAP = {
    "media":   "http://search.yahoo.com/mrss/",
    "dc":      "http://purl.org/dc/elements/1.1/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "atom":    "http://www.w3.org/2005/Atom",
}

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _strip_html(text: str) -> str:
    clean = re.sub(r"<[^>]+>", "", text or "")
    clean = re.sub(r"&amp;", "&", clean)
    clean = re.sub(r"&lt;",  "<", clean)
    clean = re.sub(r"&gt;",  ">", clean)
    clean = re.sub(r"&nbsp;", " ", clean)
    clean = re.sub(r"&#\d+;", "", clean)
    return " ".join(clean.split()).strip()

def _truncate(text: str, max_len: int = 280) -> str:
    text = (text or "").strip()
    return text[:277] + "…" if len(text) > max_len else text

def _parse_pubdate(raw: str) -> datetime | None:
    try:
        dt = parsedate_to_datetime(raw.strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    # Try ISO 8601
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None

def _is_ai_related(title: str, description: str) -> bool:
    combined = (title + " " + description).lower()
    return any(kw in combined for kw in AI_KEYWORDS)

def _find_thumbnail(item: ET.Element) -> str | None:
    # media:content
    mc = item.find(f"{{{NS_MAP['media']}}}content")
    if mc is not None:
        url = mc.attrib.get("url", "")
        if url.startswith("http"):
            return url
    # media:thumbnail
    mt = item.find(f"{{{NS_MAP['media']}}}thumbnail")
    if mt is not None:
        url = mt.attrib.get("url", "")
        if url.startswith("http"):
            return url
    # enclosure
    enc = item.find("enclosure")
    if enc is not None:
        url = enc.attrib.get("url", "")
        mtype = enc.attrib.get("type", "")
        if url.startswith("http") and "image" in mtype:
            return url
    return None


def _fetch_og_image(url: str) -> str | None:
    """Fetch og:image from an article URL. Returns URL string or None."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=4, context=CTX) as resp:
            # Only read first 32KB — og:image is always in <head>
            chunk = resp.read(32768).decode("utf-8", errors="replace")
        match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', chunk)
        if not match:
            match = re.search(r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image', chunk)
        return match.group(1) if match else None
    except Exception:
        return None


def _enrich_thumbnails(items: list[dict]) -> list[dict]:
    """Concurrently fetch og:image for items missing a thumbnail."""
    missing = [(i, item) for i, item in enumerate(items) if not item.get("thumbnail_url")]
    if not missing:
        return items

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(_fetch_og_image, item["source_url"]): i for i, item in missing}
        for future in as_completed(futures):
            idx = futures[future]
            try:
                img = future.result()
                if img:
                    items[idx]["thumbnail_url"] = img
            except Exception:
                pass
    return items


def fetch_source(source: dict) -> list[dict]:
    name = source["name"]
    url = source["url"]
    filter_ai = source["filter_ai"]

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12, context=CTX) as resp:
            raw = resp.read()
    except Exception as e:
        _log_error("rss", name, str(e))
        return []

    try:
        # Strip default namespace to simplify parsing
        xml_str = raw.decode("utf-8", errors="replace")
        xml_str = re.sub(r'xmlns="[^"]+"', '', xml_str, count=1)
        root = ET.fromstring(xml_str)
    except ET.ParseError as e:
        _log_error("rss", name, f"XML parse error: {e}")
        return []

    # Handle both RSS <channel><item> and Atom <entry>
    channel = root.find("channel")
    if channel is not None:
        entries = channel.findall("item")
    else:
        # Atom feed
        entries = root.findall(f"{{{NS_MAP['atom']}}}entry")
        if not entries:
            entries = root.findall("entry")

    now = _now_utc()
    cutoff = now.timestamp() - 86400
    items = []

    def _first_el(entry, *tags):
        """Return first non-None element from a list of tag names."""
        for tag in tags:
            el = entry.find(tag)
            if el is not None:
                return el
        return None

    for entry in entries:
        # Title
        title_el = entry.find("title")
        title = _strip_html(title_el.text if title_el is not None else "") or ""
        if not title:
            continue

        # Description / summary
        desc_el = _first_el(
            entry,
            "description",
            f"{{{NS_MAP['content']}}}encoded",
            "summary",
            f"{{{NS_MAP['atom']}}}summary",
        )
        desc_raw = desc_el.text if desc_el is not None else ""
        summary = _truncate(_strip_html(desc_raw))

        # AI filter for mixed feeds
        if filter_ai and not _is_ai_related(title, summary):
            continue

        # URL
        link_el = entry.find("link")
        if link_el is not None:
            source_url = (link_el.text or link_el.attrib.get("href", "")).strip()
        else:
            source_url = ""
        if not source_url:
            continue

        # Published date
        pub_el = _first_el(
            entry,
            "pubDate",
            "published",
            f"{{{NS_MAP['atom']}}}published",
            f"{{{NS_MAP['dc']}}}date",
        )
        pub_raw = pub_el.text if pub_el is not None else ""
        pub_dt = _parse_pubdate(pub_raw) if pub_raw else None
        if not pub_dt or pub_dt.timestamp() < cutoff:
            continue

        # Author
        author_el = _first_el(
            entry,
            "author",
            f"{{{NS_MAP['dc']}}}creator",
        )
        author = None
        if author_el is not None:
            name_el = author_el.find("name")
            author = (name_el.text if name_el is not None else author_el.text or "").strip() or None

        thumbnail_url = _find_thumbnail(entry)

        items.append({
            "id": uuid.uuid4().hex,
            "source_type": "article",
            "source_name": name,
            "source_url": source_url,
            "author": author,
            "title": title,
            "summary": summary,
            "thumbnail_url": thumbnail_url,
            "published_at": pub_dt.isoformat(),
            "fetched_at": now.isoformat(),
            "tags": ["article", name.lower().replace(" ", "-")],
            "engagement": {"likes": 0, "reposts": 0, "saves": 0},
            "raw_metadata": {"feed_name": name, "feed_url": url},
        })

    return items


def fetch_rss() -> list[dict]:
    all_items = []
    for source in RSS_SOURCES:
        all_items.extend(fetch_source(source))
        time.sleep(0.3)
    return _enrich_thumbnails(all_items)


def _log_error(category: str, name: str, error: str):
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/errors.log", "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": f"{category}:{name}",
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    results = fetch_rss()
    print(f"RSS Articles: {len(results)} items fetched")
    for r in results[:3]:
        print(f"  [{r['source_name']}] {r['title'][:80]}")
