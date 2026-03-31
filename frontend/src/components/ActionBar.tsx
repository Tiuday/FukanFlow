import { motion } from 'framer-motion'
import type { NewsItem, Interaction } from '../types'

interface Props {
  item: NewsItem
  interaction: Interaction
  onLike: () => void
  onSave: () => void
  onRepost: () => void
  onFollow: () => void
}

function fmtCount(n: number): string {
  if (n <= 0) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function ActionBar({ item, interaction, onLike, onSave, onRepost, onFollow }: Props) {
  const likeCount   = item.engagement.likes   + (interaction.liked    ? 1 : 0)
  const repostCount = item.engagement.reposts + (interaction.reposted ? 1 : 0)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      paddingTop: 14,
      borderTop: '1px solid rgba(248,248,252,0.08)',
    }}>

      {/* Like */}
      <motion.button
        whileTap={{ scale: 1.35 }}
        whileHover={{ background: 'rgba(239,107,107,0.1)' }}
        onClick={onLike}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px',
          borderRadius: 10,
          border: interaction.liked ? '1px solid rgba(239,107,107,0.3)' : '1px solid transparent',
          background: interaction.liked ? 'rgba(239,107,107,0.1)' : 'rgba(248,248,252,0.04)',
          color: interaction.liked ? '#ef6b6b' : 'rgba(248,248,252,0.42)',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <motion.svg
          width="17" height="17" viewBox="0 0 24 24"
          fill={interaction.liked ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          animate={interaction.liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
        {likeCount > 0 && <span style={{ fontWeight: 600 }}>{fmtCount(likeCount)}</span>}
      </motion.button>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 1.35 }}
        whileHover={{ background: 'rgba(240,192,96,0.1)' }}
        onClick={onSave}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px',
          borderRadius: 10,
          border: interaction.saved ? '1px solid rgba(240,192,96,0.3)' : '1px solid transparent',
          background: interaction.saved ? 'rgba(240,192,96,0.1)' : 'rgba(248,248,252,0.04)',
          color: interaction.saved ? '#f0c060' : 'rgba(248,248,252,0.42)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <motion.svg
          width="17" height="17" viewBox="0 0 24 24"
          fill={interaction.saved ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          animate={interaction.saved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </motion.svg>
      </motion.button>

      {/* Repost */}
      <motion.button
        whileTap={{ scale: 1.35 }}
        whileHover={{ background: 'rgba(80,200,144,0.1)' }}
        onClick={onRepost}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px',
          borderRadius: 10,
          border: interaction.reposted ? '1px solid rgba(80,200,144,0.3)' : '1px solid transparent',
          background: interaction.reposted ? 'rgba(80,200,144,0.1)' : 'rgba(248,248,252,0.04)',
          color: interaction.reposted ? '#50c890' : 'rgba(248,248,252,0.42)',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        {repostCount > 0 && <span style={{ fontWeight: 600 }}>{fmtCount(repostCount)}</span>}
      </motion.button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Follow source */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={!interaction.followed ? { background: 'rgba(109,106,240,0.12)' } : {}}
        onClick={onFollow}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          borderRadius: 100,
          border: interaction.followed
            ? '1px solid rgba(109,106,240,0.5)'
            : '1px solid rgba(248,248,252,0.14)',
          background: interaction.followed
            ? 'rgba(109,106,240,0.16)'
            : 'rgba(248,248,252,0.04)',
          color: interaction.followed
            ? '#6d6af0'
            : 'rgba(248,248,252,0.45)',
          fontSize: 12,
          fontWeight: interaction.followed ? 700 : 500,
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.02em',
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {interaction.followed ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Following
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Follow
          </>
        )}
      </motion.button>

    </div>
  )
}
