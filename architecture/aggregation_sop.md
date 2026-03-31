# SOP: Aggregation — Fukan AI News Board
**Layer 1 | Last Updated: 2026-03-30**

---

## Purpose
Define how all fetcher outputs are merged, deduplicated, sorted, and written to `.tmp/feed.json` — the single source of truth for the frontend.

---

## Script: `tools/aggregate.py`

### Step 1 — Run All Fetchers
Call each fetcher function and collect results. Each is wrapped independently so a failure in one never blocks others.

```
fetch_reddit()       → list[NewsItem]
fetch_arxiv()        → list[NewsItem]
fetch_huggingface()  → list[NewsItem]
fetch_rss()          → list[NewsItem]
fetch_youtube()      → list[NewsItem]
```

### Step 2 — Merge
Concatenate all lists into a single flat list.

### Step 3 — 24h Filter
Drop any item where `published_at < now_utc - 86400 seconds`.
Items with unparseable dates are dropped and logged.

### Step 4 — Deduplicate
Deduplicate by `source_url`. Keep the first occurrence (sources are fetched in priority order: Reddit → ArXiv → HuggingFace → RSS → YouTube).

### Step 5 — Sort
Sort descending by `published_at` (newest first).

### Step 6 — Write Output
Write to `.tmp/feed.json` in this envelope format:

```json
{
  "generated_at": "ISO 8601 UTC",
  "total_items": 0,
  "items_by_type": {
    "article": 0,
    "video": 0,
    "reddit": 0,
    "paper": 0,
    "model": 0
  },
  "items": [ ...UniversalNewsItem... ]
}
```

### Step 7 — Log
Append a single line to `.tmp/fetch_log.jsonl`:
```json
{"timestamp": "...", "total": 0, "by_type": {...}, "errors": [...]}
```

---

## Error Handling Rules

- If a fetcher returns `[]` due to exception, log `{"source": "...", "error": "..."}` to `.tmp/errors.log`
- If `feed.json` write fails, log and exit with code 1
- Never overwrite `feed.json` with an empty result set — keep previous version and log the failure

---

## Output Location

`.tmp/feed.json` — read by the FastAPI server and served to the frontend.

---

## Execution

```bash
py tools/aggregate.py
```

Run manually or via cron every 24h:
```
0 6 * * * cd /path/to/project && py tools/aggregate.py
```
