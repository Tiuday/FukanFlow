import type { SourceType } from '../types'
import { TYPE_COLORS } from '../types'

const TYPE_LABEL: Record<SourceType, string> = {
  article: 'Article',
  video:   'Video',
  reddit:  'Reddit',
  paper:   'Paper',
  model:   'Model',
}

interface Props {
  type: SourceType
  name: string
}

export function SourceBadge({ type, name }: Props) {
  const color = TYPE_COLORS[type]
  const label = TYPE_LABEL[type]

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      maxWidth: 260,
    }}>
      {/* Type dot */}
      <span style={{
        display: 'inline-block',
        width: 7, height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}80`,
      }} />
      {/* Type label */}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        color,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {label}
      </span>
      {/* Source name */}
      <span style={{
        fontSize: 11,
        color: 'rgba(248,248,252,0.35)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        · {name}
      </span>
    </div>
  )
}
