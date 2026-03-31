"""
Layer 3 Tool: fetch_huggingface.py
Fetches recently updated AI models from HuggingFace public API (no auth).
Returns list of Universal News Items.
"""

import sys, io

import json, uuid, ssl
import urllib.request
from datetime import datetime, timezone

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "FukanBoard/1.0"}

URL = "https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=50&full=False"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _parse_date(s: str) -> datetime | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None

def _make_summary(model_id: str, tags: list, pipeline_tag: str | None) -> str:
    parts = [f"New model release: {model_id}"]
    if pipeline_tag:
        parts.append(f"Task: {pipeline_tag.replace('-', ' ').title()}")
    if tags:
        notable = [t for t in tags[:5] if t not in ("transformers", "pytorch", "safetensors")]
        if notable:
            parts.append(f"Tags: {', '.join(notable)}")
    return " · ".join(parts)[:280]


def fetch_huggingface() -> list[dict]:
    try:
        req = urllib.request.Request(URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        _log_error("huggingface", str(e))
        return []

    now = _now_utc()
    cutoff = now.timestamp() - 86400
    items = []

    for model in data:
        model_id = model.get("modelId") or model.get("id") or ""
        if not model_id:
            continue

        last_modified = model.get("lastModified") or model.get("updatedAt") or ""
        pub_dt = _parse_date(last_modified)
        if not pub_dt or pub_dt.timestamp() < cutoff:
            continue

        pipeline_tag = model.get("pipeline_tag")
        raw_tags = model.get("tags") or []

        item_tags = ["model", "huggingface"]
        if pipeline_tag:
            item_tags.append(pipeline_tag)

        items.append({
            "id": uuid.uuid4().hex,
            "source_type": "model",
            "source_name": "HuggingFace",
            "source_url": f"https://huggingface.co/{model_id}",
            "author": model.get("author"),
            "title": model_id,
            "summary": _make_summary(model_id, raw_tags, pipeline_tag),
            "thumbnail_url": f"https://huggingface.co/{model_id}/resolve/main/thumbnail.png" if "/" in model_id else None,
            "published_at": pub_dt.isoformat(),
            "fetched_at": now.isoformat(),
            "tags": item_tags,
            "engagement": {
                "likes": model.get("likes", 0) or 0,
                "reposts": 0,
                "saves": 0,
            },
            "raw_metadata": {
                "pipeline_tag": pipeline_tag,
                "downloads": model.get("downloads"),
                "likes": model.get("likes"),
                "private": model.get("private", False),
                "tags": raw_tags[:10],
            },
        })

    return items


def _log_error(source: str, error: str):
    import os
    os.makedirs(".tmp", exist_ok=True)
    with open(".tmp/errors.log", "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": source,
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    results = fetch_huggingface()
    print(f"HuggingFace: {len(results)} models fetched")
    for r in results[:3]:
        print(f"  {r['title'][:80]} — {r['summary'][:60]}")
