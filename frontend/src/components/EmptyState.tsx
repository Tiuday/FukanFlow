import type { FilterTab } from '../types'
import { TAB_LABELS } from '../types'

interface Props {
  tab: FilterTab
  error?: string | null
}

export function EmptyState({ tab, error }: Props) {
  const label = TAB_LABELS[tab]

  if (error) {
    return (
      <div style={{
        height: 'var(--feed-h)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40 }}>◈</div>
        <h3 style={{
          fontFamily: 'var(--font-head)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text)',
        }}>
          Feed unavailable
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 320 }}>
          {error}
        </p>
        <code style={{
          fontSize: 11,
          padding: '8px 16px',
          borderRadius: 8,
          background: 'var(--surface)',
          color: 'rgba(248,248,252,0.4)',
          border: '1px solid var(--border)',
          letterSpacing: '0.02em',
        }}>
          py tools/server.py
        </code>
      </div>
    )
  }

  return (
    <div style={{
      height: 'var(--feed-h)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, opacity: 0.4 }}>◈</div>
      <p style={{
        fontFamily: 'var(--font-head)',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text)',
      }}>
        Nothing in {label} right now
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Check back soon or try another tab
      </p>
    </div>
  )
}
