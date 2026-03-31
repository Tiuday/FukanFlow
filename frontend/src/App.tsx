import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFeed } from './hooks/useFeed'
import { useInteractions } from './hooks/useInteractions'
import { useProfile } from './hooks/useProfile'
import { Header } from './components/Header'
import { FeedCard } from './components/FeedCard'
import { CardDetail } from './components/CardDetail'
import { AvatarPicker } from './components/AvatarPicker'
import { LoadingState } from './components/LoadingState'
import { EmptyState } from './components/EmptyState'
import type { NewsItem } from './types'

export default function App() {
  const feed = useFeed()
  const ix = useInteractions()
  const { profile, setAvatar } = useProfile()
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>

      <Header
        activeTab={feed.activeTab}
        countByType={feed.countByType}
        totalCount={feed.envelope?.total_items ?? 0}
        refreshing={feed.refreshing}
        lastUpdated={feed.lastUpdated}
        onTabChange={feed.setActiveTab}
        onRefresh={feed.refresh}
        error={feed.error}
        avatarSeed={profile.avatarSeed}
        onAvatarClick={() => setAvatarOpen(true)}
      />

      {feed.loading ? (
        <LoadingState />
      ) : feed.items.length === 0 ? (
        <EmptyState tab={feed.activeTab} error={feed.error} />
      ) : (
        <div
          className="feed-scroll"
          style={{ pointerEvents: selected || avatarOpen ? 'none' : undefined }}
        >
          {feed.items.map((item) => (
            <div
              key={item.id}
              style={{
                height: 'var(--feed-h)',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
              }}
            >
              <FeedCard
                item={item}
                interaction={ix.getInteraction(item.id)}
                onExpand={() => setSelected(item)}
                onLike={() => ix.toggleLike(item.id)}
                onSave={() => ix.toggleSave(item.id)}
                onRepost={() => ix.toggleRepost(item.id)}
                onFollow={() => ix.toggleFollow(item.id)}
              />
            </div>
          ))}

          {/* End-of-feed sentinel */}
          <div
            style={{
              height: 'var(--feed-h)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              scrollSnapAlign: 'start',
            }}
          >
            <div style={{ fontSize: '32px' }}>◈</div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>
              You're all caught up
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {feed.envelope?.total_items} items from the last 24–72h
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <CardDetail
            item={selected}
            interaction={ix.getInteraction(selected.id)}
            onClose={() => setSelected(null)}
            onLike={() => ix.toggleLike(selected.id)}
            onSave={() => ix.toggleSave(selected.id)}
            onRepost={() => ix.toggleRepost(selected.id)}
            onFollow={() => ix.toggleFollow(selected.id)}
          />
        )}
      </AnimatePresence>

      {avatarOpen && (
        <AvatarPicker
          currentSeed={profile.avatarSeed}
          onSelect={setAvatar}
          onClose={() => setAvatarOpen(false)}
        />
      )}

    </div>
  )
}
