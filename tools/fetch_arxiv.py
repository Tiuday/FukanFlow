"""
Layer 3 Tool: fetch_arxiv.py
Fetches recent AI research papers from ArXiv (no auth, Atom XML).
Returns list of Universal News Items.
"""

import sys, io

import uuid, ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "FukanBoard/1.0"}

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

QUERY = "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV"
URL = (
    "https://export.arxiv.org/api/query"
    f"?search_query={urllib.parse.quote(QUERY)}"
    "&sortBy=submittedDate&sortOrder=descending&max_results=50"
)

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _parse_date(s: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None

def _truncate(text: str, max_len: int = 280) -> str:
    text = " ".join((text or "").split())  # normalize whitespace
    return text[:277] + "…" if len(text) > max_len else text


def fetch_arxiv() -> list[dict]:
    import urllib.parse
    url = (
        "https://export.arxiv.org/api/query"
        f"?search_query={urllib.parse.quote(QUERY)}"
        "&sortBy=submittedDate&sortOrder=descending&max_results=50"
    )
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=CTX) as resp:
            xml_data = resp.read()
    except Exception as e:
        _log_error("arxiv", str(e))
        return []

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        _log_error("arxiv", f"XML parse error: {e}")
        return []

    now = _now_utc()
    # ArXiv doesn't publish on weekends — use 72h window to cover Friday→Monday gaps
    cutoff = now.timestamp() - (86400 * 3)
    items = []

    for entry in root.findall("atom:entry", NS):
        # Published date
        pub_str = (entry.findtext("atom:published", "", NS) or "").strip()
        pub_dt = _parse_date(pub_str)
        if not pub_dt or pub_dt.timestamp() < cutoff:
            continue

        title = _truncate((entry.findtext("atom:title", "", NS) or "").replace("\n", " ").strip(), 200)
        summary = _truncate((entry.findtext("atom:summary", "", NS) or "").replace("\n", " ").strip())

        # Source URL — prefer abs link
        source_url = ""
        for link in entry.findall("atom:link", NS):
            if link.attrib.get("rel") == "alternate" or link.attrib.get("type") == "text/html":
                source_url = link.attrib.get("href", "")
                break
        if not source_url:
            arxiv_id = (entry.findtext("atom:id", "", NS) or "").strip()
            source_url = arxiv_id  # already a URL like https://arxiv.org/abs/...

        # Authors
        authors = [
            a.findtext("atom:name", "", NS)
            for a in entry.findall("atom:author", NS)
        ]
        author = authors[0] if authors else None

        # Tags/categories
        tags = ["paper", "arxiv"]
        for cat in entry.findall("arxiv:primary_category", NS):
            term = cat.attrib.get("term", "")
            if term:
                tags.append(term)

        items.append({
            "id": uuid.uuid4().hex,
            "source_type": "paper",
            "source_name": "ArXiv",
            "source_url": source_url,
            "author": author,
            "title": title,
            "summary": summary,
            "thumbnail_url": None,
            "published_at": pub_dt.isoformat(),
            "fetched_at": now.isoformat(),
            "tags": tags,
            "engagement": {"likes": 0, "reposts": 0, "saves": 0},
            "raw_metadata": {
                "all_authors": authors[:5],
                "arxiv_id": source_url,
            },
        })

    return items


def _log_error(source: str, error: str):
    import json, os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/errors.log", "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": source,
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    results = fetch_arxiv()
    print(f"ArXiv: {len(results)} papers fetched")
    for r in results[:3]:
        print(f"  {r['title'][:80]}")
