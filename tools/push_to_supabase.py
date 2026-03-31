"""
Layer 3 Tool: push_to_supabase.py
Reads .tmp/feed.json and upserts all items into Supabase news_items table.
Uses service role key (server-side only — never expose to frontend).

Run: py tools/push_to_supabase.py
Called automatically by aggregate.py after each run.
"""
import sys, io, os, json
if not isinstance(sys.stdout, io.TextIOWrapper) or sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from pathlib import Path
from datetime import datetime, timezone, timedelta

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    print("ERROR: python-dotenv not installed. Run: pip install python-dotenv")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase not installed. Run: pip install supabase")
    sys.exit(1)

FEED_PATH = Path(__file__).parent.parent / ".tmp" / "feed.json"
BATCH_SIZE = 50


def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # Service key — server only
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
    return create_client(url, key)


def _clean_item(item: dict) -> dict:
    """Ensure all fields match the Supabase schema exactly."""
    return {
        "id":            item.get("id", ""),
        "source_type":   item.get("source_type", "article"),
        "source_name":   item.get("source_name", ""),
        "source_url":    item.get("source_url", ""),
        "author":        item.get("author"),
        "title":         (item.get("title") or "")[:500],
        "summary":       (item.get("summary") or "")[:500],
        "thumbnail_url": item.get("thumbnail_url"),
        "published_at":  item.get("published_at", ""),
        "fetched_at":    item.get("fetched_at", ""),
        "tags":          item.get("tags", []),
        "engagement":    item.get("engagement", {"likes": 0, "reposts": 0, "saves": 0}),
        "raw_metadata":  {},  # Skip raw_metadata to keep rows lean
    }


def push_feed() -> dict:
    if not FEED_PATH.exists():
        print("push_to_supabase: feed.json not found — skipping")
        return {"status": "skipped", "reason": "no feed.json"}

    with open(FEED_PATH, encoding="utf-8") as f:
        feed = json.load(f)

    items = feed.get("items", [])
    if not items:
        print("push_to_supabase: 0 items — skipping")
        return {"status": "skipped", "reason": "0 items"}

    client = get_client()
    now = datetime.now(timezone.utc)
    print(f"\npush_to_supabase: Upserting {len(items)} items...")

    pushed = 0
    errors = 0

    for i in range(0, len(items), BATCH_SIZE):
        batch = [_clean_item(item) for item in items[i:i + BATCH_SIZE]]
        try:
            client.table("news_items").upsert(
                batch,
                on_conflict="source_url",
            ).execute()
            pushed += len(batch)
            print(f"  Batch {i // BATCH_SIZE + 1}: {len(batch)} items pushed")
        except Exception as e:
            errors += 1
            _log_error(f"batch_{i // BATCH_SIZE}", str(e))
            print(f"  Batch {i // BATCH_SIZE + 1}: ERROR — {e}")

    # Prune items older than 96h to keep table lean
    cutoff = (now - timedelta(hours=96)).isoformat()
    try:
        client.table("news_items").delete().lt("published_at", cutoff).execute()
        print(f"  Pruned items older than 96h")
    except Exception as e:
        print(f"  Prune failed: {e}")

    # Log to fetch_logs
    try:
        client.table("fetch_logs").insert({
            "ran_at":   now.isoformat(),
            "total":    pushed,
            "by_type":  feed.get("items_by_type", {}),
            "error":    f"{errors} batch errors" if errors else None,
        }).execute()
    except Exception as e:
        print(f"  fetch_logs insert failed: {e}")

    result = {"status": "ok", "pushed": pushed, "errors": errors}
    print(f"\npush_to_supabase: Done. {pushed} items upserted, {errors} errors.")
    return result


def _log_error(source: str, error: str):
    err_path = Path(__file__).parent.parent / ".tmp" / "errors.log"
    err_path.parent.mkdir(exist_ok=True)
    with open(err_path, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": f"supabase:{source}",
            "error": error,
        }) + "\n")


if __name__ == "__main__":
    result = push_feed()
    print(result)
