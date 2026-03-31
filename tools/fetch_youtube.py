"""
Layer 3 Tool: fetch_youtube.py
Fetches recent videos from YouTube channel RSS feeds (no API key needed).
Returns list of Universal News Items.
"""

import sys, io

import json, time, uuid, ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "FukanBoard/1.0"}

YT_CHANNELS = [
    {"name": "Two Minute Papers",  "id": "UCbfYPyITQ-7l4upoX8nvctg"},
    {"name": "Yannic Kilcher",     "id": "UCZHmQk67mSJgfCCTn7xBfew"},
    {"name": "AI Explained",       "id": "UCNJ1Ymd5yFuUPtn21xtRbbw"},
    {"name": "Matthew Berman",     "id": "UCO2x-p9gg9TLKneXlibGR7w"},
    {"name": "Sentdex",            "id": "UCfzlCWGWYyIQ0aLC5w48gBQ"},
    {"name": "Andrej Karpathy",    "id": "UCFvEFl6bGDRzfaZvdImVseA"},
    {"name": "Fireship",           "id": "UCsBjURrPoezykLs9EqgamOA"},
]

NS = {
    "atom":   "http://www.w3.org/2005/Atom",
    "media":  "http://search.yahoo.com/mrss/",
    "yt":     "http://www.youtube.com/xml/schemas/2015",
}

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _truncate(text: str, max_len: int = 280) -> str:
    text = " ".join((text or "").split())
    return text[:277] + "…" if len(text) > max_len else text

def _parse_date(s: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%f%z"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


def fetch_channel(channel: dict) -> list[dict]:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel['id']}"
    name = channel["name"]

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
            raw = resp.read()
    except Exception as e:
        _log_error("youtube", name, str(e))
        return []

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        _log_error("youtube", name, f"XML parse error: {e}")
        return []

    now = _now_utc()
    # Use 72h window — YouTube creators don't post every day
    cutoff = now.timestamp() - (86400 * 3)
    items = []

    for entry in root.findall("atom:entry", NS):
        # Published date
        pub_str = (entry.findtext("atom:published", "", NS) or "").strip()
        pub_dt = _parse_date(pub_str)
        if not pub_dt or pub_dt.timestamp() < cutoff:
            continue

        title = (entry.findtext("atom:title", "", NS) or "").strip()
        if not title:
            continue

        # Video URL
        link_el = entry.find("atom:link", NS)
        source_url = (link_el.attrib.get("href", "") if link_el is not None else "").strip()
        if not source_url:
            # Fallback: construct from video ID
            vid_id = entry.findtext("yt:videoId", "", NS) or ""
            source_url = f"https://www.youtube.com/watch?v={vid_id}" if vid_id else ""
        if not source_url:
            continue

        # Video ID for thumbnail
        vid_id = entry.findtext("yt:videoId", "", NS) or ""
        thumbnail_url = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg" if vid_id else None

        # Description from media:group > media:description
        media_group = entry.find("media:group", NS)
        desc = ""
        if media_group is not None:
            desc_el = media_group.find("media:description", NS)
            desc = (desc_el.text or "") if desc_el is not None else ""
        summary = _truncate(desc) if desc else _truncate(f"New video by {name}: {title}")

        items.append({
            "id": uuid.uuid4().hex,
            "source_type": "video",
            "source_name": f"YouTube — {name}",
            "source_url": source_url,
            "author": name,
            "title": title,
            "summary": summary,
            "thumbnail_url": thumbnail_url,
            "published_at": pub_dt.isoformat(),
            "fetched_at": now.isoformat(),
            "tags": ["video", "youtube", name.lower().replace(" ", "-")],
            "engagement": {"likes": 0, "reposts": 0, "saves": 0},
            "raw_metadata": {
                "channel_name": name,
                "channel_id": channel["id"],
                "video_id": vid_id,
            },
        })

    return items


def fetch_youtube() -> list[dict]:
    all_items = []
    for channel in YT_CHANNELS:
        all_items.extend(fetch_channel(channel))
        time.sleep(0.25)
    return all_items


def _log_error(source: str, name: str, error: str):
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/errors.log", "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": f"{source}:{name}",
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    results = fetch_youtube()
    print(f"YouTube: {len(results)} videos fetched")
    for r in results[:3]:
        print(f"  [{r['source_name']}] {r['title'][:80]}")
