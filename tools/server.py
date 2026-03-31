"""
Layer 3 Tool: server.py
FastAPI server — serves feed.json to the React frontend.
Per server_sop.md.

Run: py tools/server.py
Serves at: http://localhost:8000
"""

import sys, io, os, json, time, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

try:
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("Missing dependencies. Run: pip install fastapi uvicorn")
    sys.exit(1)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    os.makedirs(".tmp", exist_ok=True)
    if not os.path.exists(FEED_PATH):
        print("No feed.json found — running initial aggregation...")
        _run_aggregate()
        print("Initial aggregation complete.")
    yield

app = FastAPI(title="Fukan Board API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

FEED_PATH    = ".tmp/feed.json"
LOCK_PATH    = ".tmp/refresh.lock"
START_TIME   = time.time()

def _get_tools_dir() -> str:
    return os.path.join(os.path.dirname(__file__))

def _run_aggregate():
    """Run aggregate.py as subprocess."""
    script = os.path.join(_get_tools_dir(), "aggregate.py")
    subprocess.run(
        [sys.executable, script],
        cwd=os.path.dirname(_get_tools_dir()),
        capture_output=True,
    )

def _read_feed() -> dict:
    if not os.path.exists(FEED_PATH):
        return {}
    with open(FEED_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/feed")
async def get_feed():
    """Returns the current feed.json contents."""
    if not os.path.exists(FEED_PATH):
        _run_aggregate()
    try:
        data = _read_feed()
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/refresh")
async def refresh_feed():
    """Triggers a new aggregation run. Prevents concurrent refreshes."""
    if os.path.exists(LOCK_PATH):
        return JSONResponse(
            content={"status": "busy", "message": "Refresh already in progress"},
            status_code=429,
        )

    # Acquire lock
    with open(LOCK_PATH, "w") as f:
        f.write(str(time.time()))

    try:
        _run_aggregate()
        data = _read_feed()
        return JSONResponse(content={
            "status": "ok",
            "generated_at": data.get("generated_at", ""),
            "total_items": data.get("total_items", 0),
            "items_by_type": data.get("items_by_type", {}),
        })
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)
    finally:
        if os.path.exists(LOCK_PATH):
            os.remove(LOCK_PATH)


@app.get("/health")
async def health():
    return {"status": "ok", "uptime_seconds": round(time.time() - START_TIME)}


if __name__ == "__main__":
    print("\nFukan Board API starting...")
    print("Serving at http://localhost:8000")
    print("Endpoints: GET /feed  |  POST /refresh  |  GET /health\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
