import { motion, AnimatePresence } from 'framer-motion'
import type { FilterTab } from '../types'
import { TAB_LABELS, TYPE_COLORS } from '../types'

const TABS: FilterTab[] = ['all', 'article', 'video', 'reddit', 'paper', 'model']

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`
}

interface Props {
  activeTab: FilterTab
  countByType: Record<string, number>
  totalCount: number
  refreshing: boolean
  lastUpdated: Date | null
  error: string | null
  onTabChange: (tab: FilterTab) => void
  onRefresh: () => void
  avatarSeed: string | null
  onAvatarClick: () => void
}

export function Header({
  activeTab, countByType, totalCount,
  refreshing, error,
  onTabChange, onRefresh,
  avatarSeed, onAvatarClick,
}: Props) {

  function countFor(tab: FilterTab): number {
    if (tab === 'all') return totalCount
    return countByType[tab] ?? 0
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      height: 'var(--header-h)',
      background: 'rgba(13,12,34,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Row 1: Wordmark + controls */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-head)',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}>
            FUKAN
          </span>
          <span style={{
            fontFamily: 'var(--font-head)',
            fontSize: 16,
            fontWeight: 300,
            letterSpacing: '0.12em',
            color: 'rgba(248,248,252,0.35)',
          }}>
            BOARD
          </span>
          <span style={{
            marginLeft: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 100,
            background: 'rgba(109,106,240,0.15)',
            border: '1px solid rgba(109,106,240,0.25)',
            color: '#6d6af0',
          }}>
            AI · 24H
          </span>
        </div>

        {/* Right: error dot + refresh + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AnimatePresence>
            {error && !refreshing && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: '#d94f4f',
                }}
                title={error}
              />
            )}
          </AnimatePresence>

          {/* Refresh button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              width: 34, height: 34,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: refreshing ? 'rgba(248,248,252,0.25)' : 'rgba(248,248,252,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <motion.svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4" />
            </motion.svg>
          </motion.button>

          {/* Avatar button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onAvatarClick}
            title="Choose avatar"
            style={{
              width: 34, height: 34,
              borderRadius: '50%',
              border: avatarSeed
                ? '2px solid rgba(109,106,240,0.55)'
                : '1px dashed rgba(248,248,252,0.2)',
              background: avatarSeed ? 'transparent' : 'rgba(248,248,252,0.04)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              padding: 0,
              transition: 'border-color 0.2s',
            }}
          >
            <img
              src={avatarSeed ? avatarUrl(avatarSeed) : avatarUrl('guest')}
              alt="avatar"
              width={34}
              height={34}
              style={{
                borderRadius: '50%',
                display: 'block',
                opacity: avatarSeed ? 1 : 0.45,
              }}
            />
          </motion.button>
        </div>
      </div>

      {/* Row 2: Filter tabs */}
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 2,
        overflowX: 'auto',
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          const color = tab === 'all' ? 'rgba(248,248,252,0.7)' : TYPE_COLORS[tab]
          const count = countFor(tab)

          return (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.94 }}
              onClick={() => onTabChange(tab)}
              style={{
                position: 'relative',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px',
                borderRadius: 9,
                border: isActive ? `1px solid ${color}28` : '1px solid transparent',
                background: isActive ? `${color}12` : 'transparent',
                color: isActive ? color : 'rgba(248,248,252,0.32)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {TAB_LABELS[tab]}
              {count > 0 && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 100,
                  background: isActive ? `${color}20` : 'rgba(248,248,252,0.07)',
                  color: isActive ? color : 'rgba(248,248,252,0.25)',
                  lineHeight: '16px',
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute',
                    bottom: -1, left: 8, right: 8,
                    height: 2,
                    borderRadius: 2,
                    background: color,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

    </header>
  )
}
