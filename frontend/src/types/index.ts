export type SourceType = 'article' | 'video' | 'reddit' | 'paper' | 'model'

export interface Engagement {
  likes: number
  reposts: number
  saves: number
}

export interface NewsItem {
  id: string
  source_type: SourceType
  source_name: string
  source_url: string
  author: string | null
  title: string
  summary: string
  thumbnail_url: string | null
  published_at: string
  fetched_at: string
  tags: string[]
  engagement: Engagement
  raw_metadata: Record<string, unknown>
}

export interface FeedEnvelope {
  generated_at: string
  total_items: number
  items_by_type: Record<string, number>
  items: NewsItem[]
}

export interface Interaction {
  liked: boolean
  saved: boolean
  reposted: boolean
  followed: boolean
}

export type FilterTab = 'all' | SourceType

export const TAB_LABELS: Record<FilterTab, string> = {
  all:     'All',
  article: 'Articles',
  video:   'Videos',
  reddit:  'Reddit',
  paper:   'Papers',
  model:   'Models',
}

export const TYPE_COLORS: Record<SourceType, string> = {
  article: '#3b82f6',
  video:   '#ef4444',
  reddit:  '#f97316',
  paper:   '#10b981',
  model:   '#8b5cf6',
}

export const TYPE_ICONS: Record<SourceType, string> = {
  article: '📰',
  video:   '▶',
  reddit:  '⬆',
  paper:   '📄',
  model:   '🤖',
}
