import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { FeedEnvelope, NewsItem, FilterTab } from '../types'

const AUTO_REFRESH_MS = 24 * 60 * 60 * 1000 // 24 hours

interface UseFeedReturn {
  items: NewsItem[]
  envelope: FeedEnvelope | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: Date | null
  activeTab: FilterTab
  setActiveTab: (tab: FilterTab) => void
  refresh: () => Promise<void>
  countByType: Record<string, number>
}

/** Build a FeedEnvelope from a raw Supabase rows array */
function buildEnvelope(rows: NewsItem[]): FeedEnvelope {
  const byType: Record<string, number> = {}
  for (const r of rows) {
    byType[r.source_type] = (byType[r.source_type] ?? 0) + 1
  }
  return {
    generated_at:  new Date().toISOString(),
    total_items:   rows.length,
    items_by_type: byType,
    items:         rows,
  }
}

/** Primary: read from Supabase. Returns null if unavailable. */
async function fetchFromSupabase(): Promise<FeedEnvelope | null> {
  try {
    const cutoff = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('news_items')
      .select('id,source_type,source_name,source_url,author,title,summary,thumbnail_url,published_at,fetched_at,tags,engagement,raw_metadata')
      .gte('published_at', cutoff)
      .order('published_at', { ascending: false })
      .limit(300)

    if (error) throw error
    if (!data || data.length === 0) return null
    return buildEnvelope(data as NewsItem[])
  } catch {
    return null
  }
}

/** Fallback: read from local FastAPI server */
async function fetchFromApi(): Promise<FeedEnvelope | null> {
  try {
    const res = await fetch('/api/feed', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as FeedEnvelope
  } catch {
    return null
  }
}

export function useFeed(): UseFeedReturn {
  const [envelope, setEnvelope]     = useState<FeedEnvelope | null>(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab]   = useState<FilterTab>('all')
  const autoRefreshRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const realtimeRef                 = useRef<ReturnType<typeof supabase.channel> | null>(null)

  /** Fetch from Supabase → fallback to /api/feed */
  const loadFeed = useCallback(async () => {
    let data = await fetchFromSupabase()
    let source = 'supabase'

    if (!data) {
      data = await fetchFromApi()
      source = 'api'
    }

    if (data) {
      setEnvelope(data)
      setLastUpdated(new Date())
      setError(null)
      console.log(`[useFeed] Loaded ${data.total_items} items from ${source}`)
    } else {
      setError('Could not load feed from Supabase or local server')
    }
  }, [])

  // Initial load
  useEffect(() => {
    setLoading(true)
    loadFeed().finally(() => setLoading(false))
  }, [loadFeed])

  // Supabase Realtime — prepend new items as they arrive
  useEffect(() => {
    const channel = supabase
      .channel('news_items_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'news_items' },
        (payload) => {
          const newItem = payload.new as NewsItem
          setEnvelope((prev) => {
            if (!prev) return prev
            // Avoid duplicates
            if (prev.items.some((i) => i.id === newItem.id)) return prev
            const items = [newItem, ...prev.items]
            return {
              ...prev,
              total_items:   items.length,
              items_by_type: { ...prev.items_by_type, [newItem.source_type]: (prev.items_by_type[newItem.source_type] ?? 0) + 1 },
              items,
            }
          })
        }
      )
      .subscribe()

    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-refresh every 24h
  useEffect(() => {
    autoRefreshRef.current = setInterval(loadFeed, AUTO_REFRESH_MS)
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current) }
  }, [loadFeed])

  // Restore tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as FilterTab
    if (['all','article','video','reddit','paper','model'].includes(hash)) setActiveTab(hash)
  }, [])

  const handleSetTab = useCallback((tab: FilterTab) => {
    setActiveTab(tab)
    window.location.hash = tab === 'all' ? '' : tab
  }, [])

  /** Manual refresh — triggers aggregate.py via /api/refresh then reloads */
  const refresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      // Tell backend to re-aggregate (which pushes to Supabase)
      await fetch('/api/refresh', { method: 'POST', signal: AbortSignal.timeout(60000) })
    } catch {
      // Backend may not be running — still try to reload from Supabase
    }
    await loadFeed()
    setRefreshing(false)
  }, [refreshing, loadFeed])

  const items = envelope
    ? activeTab === 'all'
      ? envelope.items
      : envelope.items.filter((i) => i.source_type === activeTab)
    : []

  return {
    items,
    envelope,
    loading,
    refreshing,
    error,
    lastUpdated,
    activeTab,
    setActiveTab: handleSetTab,
    refresh,
    countByType: envelope?.items_by_type ?? {},
  }
}
