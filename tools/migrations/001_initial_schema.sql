-- ═══════════════════════════════════════════════════════════
-- Fukan Board — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run via: py tools/run_migration.py
-- Or paste into: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. news_items ─────────────────────────────────────────
create table if not exists public.news_items (
    id              text        primary key,
    source_type     text        not null check (source_type in ('article','video','reddit','paper','model')),
    source_name     text        not null,
    source_url      text        not null,
    author          text,
    title           text        not null,
    summary         text,
    thumbnail_url   text,
    published_at    timestamptz not null,
    fetched_at      timestamptz not null,
    tags            text[]      default '{}',
    engagement      jsonb       not null default '{"likes":0,"reposts":0,"saves":0}',
    raw_metadata    jsonb       not null default '{}',
    created_at      timestamptz not null default now(),

    -- Deduplicate by source URL
    constraint news_items_source_url_unique unique (source_url)
);

-- Indexes for common query patterns
create index if not exists idx_news_items_published_at  on public.news_items (published_at desc);
create index if not exists idx_news_items_source_type   on public.news_items (source_type);
create index if not exists idx_news_items_fetched_at    on public.news_items (fetched_at desc);

-- ── 2. Row Level Security ─────────────────────────────────
alter table public.news_items enable row level security;

-- Drop existing policies if re-running migration
drop policy if exists "anon_can_read_news" on public.news_items;

-- Anyone with the anon key can read
create policy "anon_can_read_news"
    on public.news_items
    for select
    to anon, authenticated
    using (true);

-- Service role bypasses RLS automatically — no insert policy needed

-- ── 3. user_interactions ─────────────────────────────────
-- Phase 2: session-based (no auth yet). Phase 3 will add user_id.
create table if not exists public.user_interactions (
    id              uuid        primary key default gen_random_uuid(),
    session_id      text        not null,
    item_id         text        not null references public.news_items(id) on delete cascade,
    liked           boolean     not null default false,
    saved           boolean     not null default false,
    reposted        boolean     not null default false,
    followed        boolean     not null default false,
    updated_at      timestamptz not null default now(),

    constraint user_interactions_session_item_unique unique (session_id, item_id)
);

create index if not exists idx_user_interactions_session on public.user_interactions (session_id);

alter table public.user_interactions enable row level security;

drop policy if exists "users_manage_own_interactions" on public.user_interactions;

-- Users can read/write only their own session's interactions
create policy "users_manage_own_interactions"
    on public.user_interactions
    for all
    to anon, authenticated
    using (session_id = current_setting('app.session_id', true))
    with check (session_id = current_setting('app.session_id', true));

-- ── 4. fetch_logs ─────────────────────────────────────────
create table if not exists public.fetch_logs (
    id          bigserial   primary key,
    ran_at      timestamptz not null default now(),
    total       integer     not null default 0,
    by_type     jsonb       not null default '{}',
    error       text
);

-- ── 5. Realtime ───────────────────────────────────────────
-- Enable Realtime on news_items so frontend gets live updates
-- Run in Supabase Dashboard → Database → Replication → Tables
-- Or uncomment below (requires superuser):
-- alter publication supabase_realtime add table public.news_items;
