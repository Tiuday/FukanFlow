export function LoadingState() {
  return (
    <div style={{ height: 'var(--feed-h)', overflow: 'hidden' }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 'var(--feed-h)',
            position: 'relative',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 0 24px',
          }}
        >
          {/* Fake full-bleed thumbnail */}
          <div className="skeleton" style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
          }} />

          {/* Gradient overlay matching FeedCard */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, #0D0C22 0%, rgba(13,12,34,0.85) 32%, transparent 65%)',
          }} />

          {/* Content skeletons */}
          <div style={{
            position: 'relative',
            maxWidth: 900,
            margin: '0 auto',
            width: '100%',
            padding: '0 clamp(20px, 4vw, 48px)',
          }}>
            {/* Source badge row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 6, height: 6, borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: 52, height: 10, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ width: 44, height: 10, borderRadius: 4 }} />
            </div>

            {/* Title — matches clamp(22px,3.6vw,42px) */}
            <div className="skeleton" style={{ width: '88%', height: 'clamp(22px, 3.6vw, 42px)', borderRadius: 6, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '65%', height: 'clamp(22px, 3.6vw, 42px)', borderRadius: 6, marginBottom: 16 }} />

            {/* Summary — 2 lines */}
            <div className="skeleton" style={{ width: '80%', height: 'clamp(13px, 1.4vw, 16px)', borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '55%', height: 'clamp(13px, 1.4vw, 16px)', borderRadius: 4, marginBottom: 22 }} />

            {/* Author + Open button row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div className="skeleton" style={{ width: 110, height: 13, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 76, height: 36, borderRadius: 10 }} />
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 6, paddingTop: 14, borderTop: '1px solid rgba(248,248,252,0.07)' }}>
              <div className="skeleton" style={{ width: 52, height: 34, borderRadius: 10 }} />
              <div className="skeleton" style={{ width: 38, height: 34, borderRadius: 10 }} />
              <div className="skeleton" style={{ width: 52, height: 34, borderRadius: 10 }} />
              <div style={{ flex: 1 }} />
              <div className="skeleton" style={{ width: 84, height: 34, borderRadius: 100 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
