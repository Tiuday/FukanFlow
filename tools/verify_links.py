"""
Phase L — Link Verification
Tests every data source endpoint before any build begins.
Run: python tools/verify_links.py
Writes results to: .tmp/link_report.json
"""

import sys
import io
import json
import time
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timezone

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# SSL context for Windows compatibility
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (FukanBoard/1.0; +https://github.com/fukan-board)"
}

SOURCES = [
    # ── REDDIT (public JSON) ──────────────────────────────────────────────
    {
        "id": "reddit_ml",
        "name": "Reddit r/MachineLearning",
        "type": "reddit",
        "url": "https://www.reddit.com/r/MachineLearning/new.json?limit=5",
        "check_key": "data",
    },
    {
        "id": "reddit_artificial",
        "name": "Reddit r/artificial",
        "type": "reddit",
        "url": "https://www.reddit.com/r/artificial/new.json?limit=5",
        "check_key": "data",
    },
    {
        "id": "reddit_localllama",
        "name": "Reddit r/LocalLLaMA",
        "type": "reddit",
        "url": "https://www.reddit.com/r/LocalLLaMA/new.json?limit=5",
        "check_key": "data",
    },
    {
        "id": "reddit_openai",
        "name": "Reddit r/OpenAI",
        "type": "reddit",
        "url": "https://www.reddit.com/r/OpenAI/new.json?limit=5",
        "check_key": "data",
    },
    {
        "id": "reddit_singularity",
        "name": "Reddit r/singularity",
        "type": "reddit",
        "url": "https://www.reddit.com/r/singularity/new.json?limit=5",
        "check_key": "data",
    },

    # ── ARXIV (public API) ────────────────────────────────────────────────
    {
        "id": "arxiv_ai",
        "name": "ArXiv cs.AI",
        "type": "paper",
        "url": "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=3",
        "check_key": None,  # XML response — just check status 200
    },
    {
        "id": "arxiv_lg",
        "name": "ArXiv cs.LG (Machine Learning)",
        "type": "paper",
        "url": "https://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=3",
        "check_key": None,
    },

    # ── HUGGINGFACE (public API) ──────────────────────────────────────────
    {
        "id": "huggingface_models",
        "name": "HuggingFace New Models",
        "type": "model",
        "url": "https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=5",
        "check_key": None,  # JSON array
    },

    # ── RSS FEEDS (articles) ──────────────────────────────────────────────
    {
        "id": "rss_techcrunch",
        "name": "TechCrunch AI RSS",
        "type": "article",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "check_key": None,
    },
    {
        "id": "rss_venturebeat",
        "name": "VentureBeat AI RSS",
        "type": "article",
        "url": "https://venturebeat.com/category/ai/feed/",
        "check_key": None,
    },
    {
        "id": "rss_mit",
        "name": "MIT Technology Review RSS",
        "type": "article",
        "url": "https://www.technologyreview.com/feed/",
        "check_key": None,
    },
    {
        "id": "rss_theverge",
        "name": "The Verge AI RSS",
        "type": "article",
        "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
        "check_key": None,
    },
    {
        "id": "rss_wired",
        "name": "Wired RSS (AI filtered in fetch)",
        "type": "article",
        "url": "https://www.wired.com/feed/rss",
        "check_key": None,
    },
    {
        "id": "rss_toi",
        "name": "Times of India Tech RSS",
        "type": "article",
        "url": "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms",
        "check_key": None,
    },

    # ── YOUTUBE RSS (no key) ──────────────────────────────────────────────
    {
        "id": "yt_twominutepapers",
        "name": "YouTube — Two Minute Papers",
        "type": "video",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg",
        "check_key": None,
    },
    {
        "id": "yt_yannic",
        "name": "YouTube — Yannic Kilcher",
        "type": "video",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew",
        "check_key": None,
    },
    {
        "id": "yt_aiexplained",
        "name": "YouTube — AI Explained",
        "type": "video",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw",
        "check_key": None,
    },
    {
        "id": "yt_matthew",
        "name": "YouTube — Matthew Berman",
        "type": "video",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCO2x-p9gg9TLKneXlibGR7w",
        "check_key": None,
    },
    {
        "id": "yt_sentdex",
        "name": "YouTube — Sentdex",
        "type": "video",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCfzlCWGWYyIQ0aLC5w48gBQ",
        "check_key": None,
    },
]

# ANSI colors for terminal output
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def check_source(source: dict) -> dict:
    result = {
        "id": source["id"],
        "name": source["name"],
        "type": source["type"],
        "url": source["url"],
        "status": None,
        "http_code": None,
        "response_bytes": 0,
        "latency_ms": 0,
        "error": None,
        "sample_preview": None,
    }

    try:
        req = urllib.request.Request(source["url"], headers=HEADERS)
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
            latency = round((time.time() - t0) * 1000)
            body = resp.read()
            result["http_code"] = resp.status
            result["response_bytes"] = len(body)
            result["latency_ms"] = latency

            # Quick content validation
            text = body.decode("utf-8", errors="replace")
            if source["type"] == "reddit":
                data = json.loads(text)
                count = len(data.get("data", {}).get("children", []))
                result["sample_preview"] = f"{count} posts returned"
            elif source["type"] == "model":
                data = json.loads(text)
                count = len(data) if isinstance(data, list) else 0
                result["sample_preview"] = f"{count} models returned"
            elif source["type"] in ("article", "video", "paper"):
                # RSS/XML or ArXiv — check for <entry> or <item>
                if "<entry>" in text or "<item>" in text:
                    tag = "<entry>" if "<entry>" in text else "<item>"
                    count = text.count(tag)
                    result["sample_preview"] = f"{count} {tag.strip('<>')} tags found"
                else:
                    result["sample_preview"] = f"{len(text)} chars, no entries detected"

            result["status"] = "ok"

    except urllib.error.HTTPError as e:
        result["status"] = "fail"
        result["http_code"] = e.code
        result["error"] = f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        result["status"] = "fail"
        result["error"] = f"URL error: {e.reason}"
    except Exception as e:
        result["status"] = "fail"
        result["error"] = str(e)

    return result


def run_verification():
    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{CYAN}║   FUKAN BOARD — Phase L: Link Verification   ║{RESET}")
    print(f"{BOLD}{CYAN}╚══════════════════════════════════════════════╝{RESET}\n")
    print(f"Testing {len(SOURCES)} sources...\n")

    results = []
    passed = 0
    failed = 0

    # Group by type for organized output
    type_order = ["reddit", "paper", "model", "article", "video"]
    type_labels = {
        "reddit": "REDDIT",
        "paper": "ARXIV / PAPERS",
        "model": "HUGGINGFACE",
        "article": "RSS ARTICLES",
        "video": "YOUTUBE RSS",
    }

    sources_by_type = {t: [] for t in type_order}
    for s in SOURCES:
        sources_by_type[s["type"]].append(s)

    for stype in type_order:
        group = sources_by_type[stype]
        if not group:
            continue
        print(f"{BOLD}── {type_labels[stype]} ──────────────────────────────{RESET}")
        for source in group:
            print(f"  Testing: {source['name']}...", end=" ", flush=True)
            result = check_source(source)
            results.append(result)
            time.sleep(0.3)  # polite rate limiting

            if result["status"] == "ok":
                passed += 1
                preview = f"  [{result['sample_preview']}]" if result["sample_preview"] else ""
                print(f"{GREEN}✓ OK{RESET}  {result['latency_ms']}ms{YELLOW}{preview}{RESET}")
            else:
                failed += 1
                print(f"{RED}✗ FAIL{RESET}  {result['error']}")

        print()

    # Summary
    total = passed + failed
    print(f"{BOLD}╔══════════════════════════════╗{RESET}")
    print(f"{BOLD}║  RESULTS: {GREEN}{passed}/{total} PASSED{RESET}{BOLD}          ║{RESET}")
    if failed > 0:
        print(f"{BOLD}║  {RED}{failed} source(s) need attention{RESET}{BOLD}    ║{RESET}")
    print(f"{BOLD}╚══════════════════════════════╝{RESET}\n")

    if failed > 0:
        print(f"{RED}Failed sources:{RESET}")
        for r in results:
            if r["status"] == "fail":
                print(f"  ✗ {r['name']} — {r['error']}")
        print()

    # Write report to .tmp/
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {"total": total, "passed": passed, "failed": failed},
        "results": results,
    }
    report_path = ".tmp/link_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Full report saved to: {CYAN}{report_path}{RESET}\n")

    if failed == 0:
        print(f"{GREEN}{BOLD}✅ Phase L GATE: ALL SOURCES GREEN — Ready for Phase A{RESET}\n")
    else:
        print(f"{YELLOW}{BOLD}⚠️  Phase L GATE: Fix failed sources before proceeding to Phase A{RESET}\n")

    return report


if __name__ == "__main__":
    run_verification()
