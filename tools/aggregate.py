"""
Layer 3 Tool: aggregate.py
Runs all fetchers, merges results, deduplicates, sorts, writes .tmp/feed.json.
Per aggregation_sop.md — this is the single source of truth builder.

Run: py tools/aggregate.py
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import json, os, time
from datetime import datetime, timezone

# Add tools/ to path so we can import siblings
sys.path.insert(0, os.path.dirname(__file__))

from fetch_reddit      import fetch_reddit
from fetch_arxiv       import fetch_arxiv
from fetch_huggingface import fetch_huggingface
from fetch_rss         import fetch_rss
from fetch_youtube     import fetch_youtube


TMP_DIR   = ".tmp"
FEED_PATH = os.path.join(TMP_DIR, "feed.json")
LOG_PATH  = os.path.join(TMP_DIR, "fetch_log.jsonl")
ERR_PATH  = os.path.join(TMP_DIR, "errors.log")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _parse_iso(s: str) -> float:
    """Parse ISO 8601 string → Unix timestamp. Returns 0.0 on failure."""
    if not s:
        return 0.0
    try:
        from datetime import datetime, timezone
        # Handle common formats
        for fmt in (
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S.%fZ",
        ):
            try:
                dt = datetime.strptime(s.strip(), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.timestamp()
            except ValueError:
                continue
        # Fallback: fromisoformat (Python 3.11+)
        dt = datetime.fromisoformat(s.strip().replace("Z", "+00:00"))
        return dt.timestamp()
    except Exception:
        return 0.0


def run_fetcher(name: str, fn) -> list[dict]:
    print(f"  Fetching {name}...", end=" ", flush=True)
    t0 = time.time()
    try:
        results = fn()
        elapsed = round((time.time() - t0) * 1000)
        print(f"{len(results)} items  ({elapsed}ms)")
        return results
    except Exception as e:
        elapsed = round((time.time() - t0) * 1000)
        print(f"FAILED ({elapsed}ms) — {e}")
        _log_error(name, str(e))
        return []


def aggregate():
    os.makedirs(TMP_DIR, exist_ok=True)
    now = _now_utc()
    print(f"\nFukan Board — Aggregation Run")
    print(f"Time: {now.isoformat()}\n")

    # Step 1: Run all fetchers (each fetcher applies its own time window)
    all_items = []
    all_items.extend(run_fetcher("Reddit",      fetch_reddit))
    all_items.extend(run_fetcher("ArXiv",       fetch_arxiv))
    all_items.extend(run_fetcher("HuggingFace", fetch_huggingface))
    all_items.extend(run_fetcher("RSS Feeds",   fetch_rss))
    all_items.extend(run_fetcher("YouTube",     fetch_youtube))

    print(f"\nRaw total: {len(all_items)} items")

    # Step 2: Drop items with unparseable dates only (time window owned by each fetcher)
    filtered = []
    dropped_date = 0
    for item in all_items:
        ts = _parse_iso(item.get("published_at", ""))
        if ts == 0.0:
            dropped_date += 1
        else:
            filtered.append(item)
    print(f"After date validation: {len(filtered)} items  (dropped {dropped_date} with unparseable dates)")

    # Step 3: Deduplicate by source_url
    seen_urls = set()
    deduped = []
    for item in filtered:
        url = item.get("source_url", "").strip()
        if url and url not in seen_urls:
            seen_urls.add(url)
            deduped.append(item)
    print(f"After dedup: {len(deduped)} items  (removed {len(filtered) - len(deduped)} duplicates)")

    # Step 4: Sort by published_at descending
    deduped.sort(key=lambda x: _parse_iso(x.get("published_at", "")), reverse=True)

    # Step 5: Count by type
    by_type: dict[str, int] = {}
    for item in deduped:
        t = item.get("source_type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1

    print(f"\nBreakdown: {by_type}")

    # Step 6: Write feed.json (safe write — never overwrite with empty)
    if not deduped:
        print("\nWARNING: 0 items after processing — keeping previous feed.json intact")
        _log_run(now, 0, by_type, error="0 items — kept previous feed")
        return

    envelope = {
        "generated_at": now.isoformat(),
        "total_items": len(deduped),
        "items_by_type": by_type,
        "items": deduped,
    }

    # Write to temp first, then rename (atomic write)
    tmp_path = FEED_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, FEED_PATH)

    print(f"\nWritten to {FEED_PATH}  ({os.path.getsize(FEED_PATH):,} bytes)")

    # Step 7: Log run
    _log_run(now, len(deduped), by_type)

    print(f"\nDone. Feed ready at {FEED_PATH}")

    # Step 8: Push to Supabase (non-blocking — failure keeps local feed intact)
    try:
        from push_to_supabase import push_feed
        push_feed()
    except Exception as e:
        print(f"\nWARNING: Supabase push failed — {e}")
        print("Local feed.json is intact. Dashboard still works via /api/feed fallback.\n")


def _log_run(now: datetime, total: int, by_type: dict, error: str = ""):
    entry = {
        "timestamp": now.isoformat(),
        "total": total,
        "by_type": by_type,
    }
    if error:
        entry["error"] = error
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def _log_error(source: str, error: str):
    with open(ERR_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": _now_utc().isoformat(),
            "source": source,
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    aggregate()
