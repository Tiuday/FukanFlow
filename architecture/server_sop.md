# SOP: FastAPI Server — Fukan AI News Board
**Layer 1 | Last Updated: 2026-03-30**

---

## Purpose
Define the behavior of `tools/server.py` — the lightweight FastAPI backend that serves feed data to the React frontend and exposes a refresh trigger.

---

## Stack
- **FastAPI** + **uvicorn** (ASGI server)
- Port: `8000`
- CORS: allow `http://localhost:5173` (Vite dev) and `http://localhost:4173` (Vite preview)

---

## Endpoints

### `GET /feed`
Returns the current `.tmp/feed.json` contents.
- If file doesn't exist → run `aggregate.py` first, then return result
- Response shape matches the aggregation envelope format

### `POST /refresh`
Triggers `aggregate.py` as a subprocess, waits for completion, returns new feed.
- Prevents concurrent refresh calls (lock file: `.tmp/refresh.lock`)
- Returns `{"status": "ok", "generated_at": "...", "total_items": N}`

### `GET /health`
Returns `{"status": "ok", "uptime_seconds": N}`

---

## Startup Behavior
On first startup, if `.tmp/feed.json` does not exist, automatically run `aggregate.py` to populate it.

---

## Running the Server

```bash
pip install fastapi uvicorn
py tools/server.py
```

Server runs at `http://localhost:8000`

---

## CORS Configuration
```python
allow_origins = ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"]
allow_methods = ["GET", "POST"]
allow_headers = ["*"]
```
