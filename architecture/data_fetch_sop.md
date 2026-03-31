# SOP: Data Fetch — Fukan AI News Board
**Layer 1 | Last Updated: 2026-03-30**

---

## Purpose
Define exactly how each data source is fetched, parsed, and normalized into the Universal News Item schema. Each fetcher is an independent, atomic Python script in `tools/`.

---

## Universal Output Schema
Every fetcher MUST return a list of dicts matching this shape exactly:

```python
{
    "id":           str,   # uuid4 string
    "source_type":  str,   # "article" | "video" | "reddit" | "paper" | "model"
    "source_name":  str,   # Human-readable source (e.g. "TechCrunch")
    "source_url":   str,   # Direct URL to the original post/article/video
    "author":       str | None,
    "title":        str,
    "summary":      str,   # Max 280 chars, truncate with "…" if needed
    "thumbnail_url": str | None,
    "published_at": str,   # ISO 8601 UTC (e.g. "2026-03-30T10:00:00Z")
    "fetched_at":   str,   # ISO 8601 UTC — set at fetch time
    "tags":         list[str],
    "engagement":   {"likes": 0, "reposts": 0, "saves": 0},
    "raw_metadata": dict   # Source-specific original fields
}
```

---

## Fetcher: Reddit (`tools/fetch_reddit.py`)

**Endpoint:** `https://www.reddit.com/r/{sub}/new.json?limit=25`
**Auth:** None (public JSON)
**Subreddits:** r/MachineLearning · r/artificial · r/LocalLLaMA · r/OpenAI · r/singularity

**Parse Logic:**
- `data.children[].data` → each post
- `title` → `title`
- `selftext` (first 280 chars) OR `url` preview → `summary`
- `url` → `source_url` (external link or reddit permalink)
- `permalink` → reddit link if external url used
- `thumbnail` → `thumbnail_url` (skip "self", "default", "nsfw" values)
- `author` → `author`
- `created_utc` → convert to ISO 8601 → `published_at`
- Tags: `["reddit", sub_name]`

**24h Filter:** `created_utc >= now_utc - 86400`

**Rate Limit:** 1 request per subreddit, 0.5s sleep between subreddits.

---

## Fetcher: ArXiv (`tools/fetch_arxiv.py`)

**Endpoint:** `https://export.arxiv.org/api/query`
**Params:** `search_query=cat:cs.AI OR cat:cs.LG OR cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=50`
**Auth:** None
**Format:** Atom XML

**Parse Logic:**
- Parse with `xml.etree.ElementTree`
- `<entry>` → each paper
- `<title>` → `title` (strip newlines)
- `<summary>` (first 280 chars) → `summary`
- `<link rel="alternate">` → `source_url`
- `<author><name>` (first author) → `author`
- `<published>` → `published_at`
- `<category term>` → `tags`
- No thumbnail for papers → `thumbnail_url = None`

**24h Filter:** `published` date >= now - 24h

---

## Fetcher: HuggingFace (`tools/fetch_huggingface.py`)

**Endpoint:** `https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=50&full=False`
**Auth:** None
**Format:** JSON array

**Parse Logic:**
- Each item in array → one model release
- `modelId` → `title` (e.g. "mistralai/Mistral-7B-v0.3")
- `author` → `author`
- `lastModified` → `published_at`
- `source_url` = `https://huggingface.co/{modelId}`
- `summary` = `"New model: {modelId} — updated on {date}"`
- `tags` = `pipeline_tag` + `["huggingface", "model-release"]`
- `thumbnail_url = None`

**24h Filter:** `lastModified >= now - 24h`

---

## Fetcher: RSS Articles (`tools/fetch_rss.py`)

**Sources:**
```python
RSS_SOURCES = [
    {"name": "TechCrunch",         "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"name": "VentureBeat",        "url": "https://venturebeat.com/category/ai/feed/"},
    {"name": "MIT Tech Review",    "url": "https://www.technologyreview.com/feed/"},
    {"name": "The Verge",          "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
    {"name": "Wired",              "url": "https://www.wired.com/feed/rss"},
    {"name": "Times of India",     "url": "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms"},
]
```

**Parse Logic (RSS `<item>`):**
- `<title>` → `title`
- `<description>` (strip HTML tags, first 280 chars) → `summary`
- `<link>` → `source_url`
- `<author>` or `<dc:creator>` → `author`
- `<pubDate>` → parse RFC 2822 → ISO 8601 → `published_at`
- `<media:content url>` or `<enclosure url>` → `thumbnail_url`
- Tags: `["article", source_name.lower().replace(" ", "-")]`

**Wired AI filter:** After fetching full feed, keep only items where `title.lower()` or `description.lower()` contains any of: `["ai", "artificial intelligence", "machine learning", "llm", "gpt", "neural", "model"]`

**24h Filter:** `pubDate >= now - 24h`

---

## Fetcher: YouTube RSS (`tools/fetch_youtube.py`)

**Endpoint:** `https://www.youtube.com/feeds/videos.xml?channel_id={id}`
**Auth:** None
**Format:** Atom XML

**Channels:**
```python
YT_CHANNELS = [
    {"name": "Two Minute Papers",  "id": "UCbfYPyITQ-7l4upoX8nvctg"},
    {"name": "Yannic Kilcher",     "id": "UCZHmQk67mSJgfCCTn7xBfew"},
    {"name": "AI Explained",       "id": "UCNJ1Ymd5yFuUPtn21xtRbbw"},
    {"name": "Matthew Berman",     "id": "UCO2x-p9gg9TLKneXlibGR7w"},
    {"name": "Sentdex",            "id": "UCfzlCWGWYyIQ0aLC5w48gBQ"},
]
```

**Parse Logic (Atom `<entry>`):**
- `<title>` → `title`
- `<media:description>` (first 280 chars) → `summary`
- `<link href>` → `source_url`
- `<author><name>` → `author` (= channel name)
- `<published>` → `published_at`
- `<media:thumbnail url>` → `thumbnail_url`
- Tags: `["video", "youtube", channel_name.lower().replace(" ", "-")]`

**24h Filter:** `published >= now - 24h`

---

## Common Rules (All Fetchers)

1. Every fetcher is wrapped in `try/except` — failure logs to `.tmp/errors.log` and returns `[]`
2. All `published_at` values must be UTC ISO 8601 strings
3. Summary is always max 280 chars — use `summary[:277] + "…"` if longer
4. `id` is always `uuid.uuid4().hex`
5. `engagement` always initializes as `{"likes": 0, "reposts": 0, "saves": 0}`
6. `fetched_at` is always `datetime.now(timezone.utc).isoformat()`
7. Never raise — always return `[]` on error
