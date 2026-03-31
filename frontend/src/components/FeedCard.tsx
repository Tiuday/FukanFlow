import { motion } from 'framer-motion'
import type { NewsItem, Interaction, SourceType } from '../types'
import { TYPE_COLORS } from '../types'
import { SourceBadge } from './SourceBadge'
import { ActionBar } from './ActionBar'

/* Very dark type-specific backgrounds for text-only cards */
const TYPE_BG: Record<SourceType, string> = {
  article: 'linear-gradient(155deg, #08101e 0%, #0c1626 100%)',
  video:   'linear-gradient(155deg, #160808 0%, #1c0c0e 100%)',
  reddit:  'linear-gradient(155deg, #150b04 0%, #1c1008 100%)',
  paper:   'linear-gradient(155deg, #04120e 0%, #051a14 100%)',
  model:   'linear-gradient(155deg, #0d0920 0%, #120c2c 100%)',
}

const TYPE_GLYPH: Record<SourceType, string> = {
  article: '∷',
  video:   '▶',
  reddit:  '⇧',
  paper:   '∫',
  model:   '◈',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  item: NewsItem
  interaction: Interaction
  onExpand: () => void
  onLike: () => void
  onSave: () => void
  onRepost: () => void
  onFollow: () => void
}

export function FeedCard({ item, interaction, onExpand, onLike, onSave, onRepost, onFollow }: Props) {
  const color    = TYPE_COLORS[item.source_type]
  const isVideo  = item.source_type === 'video'
  const hasThumb = !!item.thumbnail_url

  return (
    <div
      onClick={onExpand}
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'var(--bg)',
      }}
    >
      {/* ── Layer 1: Background ─────────────────────────────── */}
      {hasThumb ? (
        <>
          <img
            src={item.thumbnail_url!}
            alt=""
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 20%',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {/* Deep gradient: strong at bottom, fades to semi-transparent at top */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #0D0C22 0%, rgba(13,12,34,0.92) 35%, rgba(13,12,34,0.5) 58%, rgba(13,12,34,0.15) 80%, transparent 100%)',
          }} />
        </>
      ) : (
        /* Text-only card: type-colored dark gradient + watermark glyph */
        <div style={{ position: 'absolute', inset: 0, background: TYPE_BG[item.source_type] }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', overflow: 'hidden',
          }}>
            <span style={{
              fontSize: 'clamp(160px, 22vw, 300px)',
              lineHeight: 1,
              opacity: 0.035,
              color,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 900,
              userSelect: 'none',
            }}>
              {TYPE_GLYPH[item.source_type]}
            </span>
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 70% 30%, ${color}0c 0%, transparent 65%)`,
          }} />
          {/* Type color accent line at top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${color}60, transparent)`,
          }} />
        </div>
      )}

      {/* ── Layer 2: Video play badge ───────────────────────── */}
      {isVideo && hasThumb && (
        <div style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(13,12,34,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(248,248,252,0.2)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Layer 3: Content (bottom-anchored) ─────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '0 0 24px 0',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(20px, 4vw, 48px)' }}>

          {/* Source + timestamp */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <SourceBadge type={item.source_type} name={item.source_name} />
            <span style={{
              fontSize: 12,
              letterSpacing: '0.04em',
              color: 'rgba(248,248,252,0.38)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeAgo(item.published_at)}
            </span>
          </div>

          {/* Title — large, readable on PC */}
          <h2
            className="line-clamp-3"
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: 'clamp(22px, 3.6vw, 42px)',
              fontWeight: 800,
              lineHeight: 1.18,
              color: '#F8F8FC',
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}
          >
            {item.title}
          </h2>

          {/* Summary — 2 lines, readable size */}
          {item.summary && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: 'clamp(13px, 1.4vw, 16px)',
                lineHeight: 1.6,
                color: 'rgba(248,248,252,0.52)',
                marginBottom: 18,
                maxWidth: '72ch',
              }}
            >
              {item.summary}
            </p>
          )}

          {/* Author + Open button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            gap: 16,
          }}>
            <span style={{
              fontSize: 13,
              color: 'rgba(248,248,252,0.35)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.author
                ? <><span style={{ color: 'rgba(248,248,252,0.22)' }}>by </span><span style={{ color: 'rgba(248,248,252,0.58)' }}>{item.author}</span></>
                : null}
            </span>

            <motion.button
              whileHover={{ scale: 1.04, x: 1 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); window.open(item.source_url, '_blank', 'noopener') }}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px',
                borderRadius: 10,
                border: `1px solid ${color}50`,
                background: `${color}18`,
                color,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-head)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
            >
              Open
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </motion.button>
          </div>

          {/* Action bar — stops propagation */}
          <div onClick={(e) => e.stopPropagation()}>
            <ActionBar
              item={item}
              interaction={interaction}
              onLike={onLike}
              onSave={onSave}
              onRepost={onRepost}
              onFollow={onFollow}
            />
          </div>

        </div>
      </div>

      {/* ── Layer 4: Tap-to-expand hint ─────────────────────── */}
      <motion.div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
      >
        <div style={{
          padding: '9px 18px',
          borderRadius: 100,
          background: 'rgba(13,12,34,0.72)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(248,248,252,0.12)',
          fontSize: 11,
          color: 'rgba(248,248,252,0.6)',
          letterSpacing: '0.07em',
          fontWeight: 600,
        }}>
          CLICK TO EXPAND
        </div>
      </motion.div>

    </div>
  )
}
