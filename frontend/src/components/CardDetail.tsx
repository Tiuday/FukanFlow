import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { NewsItem, Interaction } from '../types'
import { TYPE_COLORS } from '../types'
import { SourceBadge } from './SourceBadge'
import { ActionBar } from './ActionBar'

interface Props {
  item: NewsItem
  interaction: Interaction
  onClose: () => void
  onLike: () => void
  onSave: () => void
  onRepost: () => void
  onFollow: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CardDetail({ item, interaction, onClose, onLike, onSave, onRepost, onFollow }: Props) {
  const color = TYPE_COLORS[item.source_type]
  const panelRef = useRef<HTMLDivElement>(null)
  const hasThumb = !!item.thumbnail_url

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(7, 6, 20, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 34, stiffness: 320 }}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 50,
          maxHeight: '82dvh',
          background: 'rgba(12,11,28,0.98)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: `1px solid ${color}28`,
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 300 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => { if (info.offset.y > 100) onClose() }}
          style={{ cursor: 'grab', touchAction: 'none', paddingTop: 14, paddingBottom: 6 }}
        >
          <div style={{
            width: 40, height: 4,
            margin: '0 auto',
            borderRadius: 2,
            background: 'rgba(248,248,252,0.15)',
          }} />
        </motion.div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 36 }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 clamp(20px, 4vw, 48px)' }}>

            {/* Thumbnail banner (if available) */}
            {hasThumb && (
              <div style={{
                position: 'relative',
                width: '100%',
                height: 'clamp(160px, 22vw, 260px)',
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                marginTop: 8,
              }}>
                <img
                  src={item.thumbnail_url!}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                  onError={(e) => { (e.target as HTMLImageElement).closest('div')!.style.display = 'none' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to right, ${color}18 0%, transparent 60%)`,
                }} />
              </div>
            )}

            {/* Source + timestamp */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              marginTop: hasThumb ? 0 : 8,
            }}>
              <SourceBadge type={item.source_type} name={item.source_name} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(248,248,252,0.32)', letterSpacing: '0.03em' }}>
                  {formatDate(item.published_at)}
                </span>
                {/* Close button */}
                <button
                  onClick={onClose}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: '1px solid rgba(248,248,252,0.1)',
                    background: 'rgba(248,248,252,0.05)',
                    color: 'rgba(248,248,252,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 16, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'var(--font-head)',
              fontSize: 'clamp(20px, 3.2vw, 32px)',
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#F8F8FC',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}>
              {item.title}
            </h2>

            {/* Full summary */}
            {item.summary && (
              <p style={{
                fontSize: 'clamp(14px, 1.5vw, 16px)',
                lineHeight: 1.75,
                color: 'rgba(248,248,252,0.62)',
                marginBottom: 22,
              }}>
                {item.summary}
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 22,
              }}>
                {item.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 100,
                      border: `1px solid ${color}28`,
                      background: `${color}0c`,
                      color: `${color}cc`,
                      letterSpacing: '0.04em',
                      textTransform: 'lowercase',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author */}
            {item.author && (
              <p style={{ fontSize: 13, color: 'rgba(248,248,252,0.32)', marginBottom: 24 }}>
                by{' '}
                <span style={{ color: 'rgba(248,248,252,0.68)', fontWeight: 600 }}>
                  {item.author}
                </span>
              </p>
            )}

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'rgba(248,248,252,0.07)',
              marginBottom: 22,
            }} />

            {/* Actions */}
            <div style={{ marginBottom: 26 }}>
              <ActionBar
                item={item}
                interaction={interaction}
                onLike={onLike}
                onSave={onSave}
                onRepost={onRepost}
                onFollow={onFollow}
              />
            </div>

            {/* Primary CTA */}
            <motion.a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.018, y: -1 }}
              whileTap={{ scale: 0.975 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                width: '100%',
                padding: '16px 24px',
                borderRadius: 14,
                background: color,
                color: '#fff',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                boxShadow: `0 8px 32px ${color}40`,
              }}
            >
              {item.source_type === 'video' ? 'Watch on YouTube' :
               item.source_type === 'reddit' ? 'View on Reddit' :
               item.source_type === 'paper' ? 'Read Paper' :
               item.source_type === 'model' ? 'View Model' :
               'Read Full Article'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </motion.a>

          </div>
        </div>
      </motion.div>
    </>
  )
}
