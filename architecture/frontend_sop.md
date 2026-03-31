# SOP: Frontend Architecture — Fukan AI News Board
**Layer 1 | Last Updated: 2026-03-30**

---

## Purpose
Define the React component structure, section layout, interaction model, and styling system for the Fukan Board dashboard.

---

## Tech Stack
- **React 18** + **TypeScript** (via Vite)
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations and micro-interactions

---

## Directory Structure

```
frontend/
├── src/
│   ├── types/index.ts          # NewsItem type, FeedEnvelope type
│   ├── hooks/
│   │   ├── useFeed.ts          # Fetches + caches feed, auto-refresh
│   │   └── useInteractions.ts  # localStorage like/save/repost/follow
│   ├── components/
│   │   ├── Header.tsx          # Logo + refresh button + last-updated time
│   │   ├── FilterTabs.tsx      # All | Articles | Videos | Reddit | Papers | Models
│   │   ├── NewsCard.tsx        # Universal card (article, reddit, paper, model)
│   │   ├── VideoCard.tsx       # Video card with thumbnail + play overlay
│   │   ├── ActionBar.tsx       # Like / Save / Repost / Follow Source
│   │   ├── SourceBadge.tsx     # Color-coded pill showing source name
│   │   ├── RefreshButton.tsx   # Manual refresh with spinner animation
│   │   ├── SectionGrid.tsx     # Responsive grid wrapper for cards
│   │   ├── EmptyState.tsx      # "No items in last 24h" placeholder
│   │   └── LoadingState.tsx    # Skeleton loading cards
│   ├── App.tsx                 # Root component, assembles everything
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind base + custom scrollbar
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## Design System

### Color Palette
```
Background:     #07070f   (near-black)
Surface:        #10101c   (card bg)
Surface Hover:  #1a1a2e   (card hover)
Border:         #1e1e35   (subtle dividers)
Text Primary:   #f0f0ff
Text Secondary: #8888aa
```

### Source Badge Colors
```
article:  #3b82f6  (blue)
video:    #ef4444  (red)
reddit:   #f97316  (orange)
paper:    #10b981  (emerald)
model:    #8b5cf6  (violet)
```

### Typography
- Font: `Inter` (Google Fonts)
- Headings: `font-semibold`
- Body: `font-normal`
- Timestamps: `text-xs text-secondary`

---

## Component Specs

### `NewsCard`
- Shows: SourceBadge · title · summary · author · relative timestamp
- Thumbnail (if available): top of card, 16:9 aspect ratio, cover fit
- Hover: `scale(1.01)` + shadow deepens (Framer Motion `whileHover`)
- Click: opens `source_url` in new tab
- Bottom: `ActionBar`

### `VideoCard`
- Same as NewsCard but thumbnail always shown
- Play button overlay on thumbnail (centered, semi-transparent circle)
- Source badge always red (video)

### `FilterTabs`
- Tabs: All · Articles · Videos · Reddit · Papers · Models
- Active tab: underline + accent color
- Tab shows item count in small badge
- Animated indicator slides between tabs (Framer Motion `layoutId`)

### `ActionBar`
- 4 icon buttons: Heart (Like) · Bookmark (Save) · Repeat (Repost) · Bell (Follow Source)
- Each toggles a filled/unfilled state stored in `localStorage`
- Micro-animation on toggle: `scale(1.3)` bounce (Framer Motion `whileTap`)
- Counts show next to Like + Repost (initialized from engagement.likes/reposts, incremented locally)

### `Header`
- Left: "FUKAN BOARD" wordmark + "AI · 24h" subtitle
- Right: last-updated timestamp + `RefreshButton`
- Sticky top, blur backdrop

### `RefreshButton`
- On click: calls `POST /refresh`, shows spinning animation
- Shows "Updated X minutes ago" after refresh

---

## Data Fetching

### `useFeed` hook
```typescript
- Fetches GET http://localhost:8000/feed on mount
- Caches in component state
- Auto-refresh: setInterval every 24h (86400000ms)
- Exposes: { items, loading, error, lastUpdated, refresh }
```

### `useInteractions` hook
```typescript
- Reads/writes to localStorage key "fukan_interactions"
- Shape: { [itemId]: { liked, saved, reposted, followed } }
- Exposes: { getInteraction, toggleLike, toggleSave, toggleRepost, toggleFollow }
```

---

## Layout

```
┌─────────────────────────────────────┐
│  HEADER  (sticky)                   │
├─────────────────────────────────────┤
│  FILTER TABS                        │
├─────────────────────────────────────┤
│                                     │
│  SECTION GRID (responsive)          │
│  [ Card ] [ Card ] [ Card ]         │
│  [ Card ] [ Card ] [ Card ]         │
│                                     │
└─────────────────────────────────────┘
```

- Desktop: 3-column grid
- Tablet: 2-column grid
- Mobile: 1-column grid

---

## Interaction Rules

1. Clicking a card opens `source_url` in a new tab — never navigate away from dashboard
2. Like/Save/Repost/Follow state persists in localStorage across page refreshes
3. Filter tab selection is URL-hash based (`#articles`, `#videos`, etc.) for shareability
4. Refresh button is disabled while refresh is in progress
5. If `/feed` returns error, show last cached data + error banner — never show blank page
