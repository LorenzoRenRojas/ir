import type { RegTopic } from '@/lib/reg-topics'
import CopyBlock from '../CopyBlock'

const sans = 'var(--font-geist-sans, sans-serif)'
const mono = 'var(--font-geist-mono, monospace)'
const crimson = '#C41230'

function Urgency({ t }: { t: RegTopic }) {
  const open = t.urgency === 'comment-window' && t.daysToComment !== null
  // Closing inside a fortnight is the difference between "worth a post" and
  // "worth today's post", so it gets its own colour rather than a shared chip.
  const soon = open && (t.daysToComment as number) <= 14
  const color = soon ? crimson : open ? '#b45309' : 'rgba(255,255,255,0.3)'
  const label = open
    ? `${t.daysToComment} ${t.daysToComment === 1 ? 'DAY' : 'DAYS'} TO COMMENT`
    : t.typeLabel

  return (
    <span style={{
      fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color,
      border: `1px solid ${color}`, padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default function TopicList({ topics }: { topics: RegTopic[] }) {
  if (topics.length === 0) {
    return (
      <div style={{ border: '1px dashed rgba(255,255,255,0.18)', padding: '32px 28px', color: 'rgba(255,255,255,0.4)', fontSize: 13.5, lineHeight: 1.7, fontFamily: sans }}>
        No procurement-related rules in the last 45 days, or the Federal Register is unreachable
        right now. The feed is free and keyless, so this is almost always upstream and temporary —
        it refreshes every six hours.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {topics.map(t => (
        <div key={t.id} style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <Urgency t={t} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '0.08em', fontFamily: mono }}>
                {t.agency.toUpperCase()}
              </span>
            </div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.4, fontFamily: sans }}>{t.title}</div>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, color: crimson, fontSize: 11, textDecoration: 'none', fontFamily: mono, letterSpacing: '0.06em' }}
            >
              READ THE RULE ON FEDERALREGISTER.GOV →
            </a>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 8 }}>VERIFIED FACTS — QUOTABLE AS WRITTEN</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.55)', fontSize: 12.5, lineHeight: 1.7, fontFamily: sans }}>
              {t.facts.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 8 }}>A QUESTION TO ANSWER IN THE POST</div>
            <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.7, fontFamily: sans }}>{t.angle}</div>
          </div>

          <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em' }}>DRAFT — FILL THE BRACKETS</div>
            <CopyBlock text={`${t.scaffold}\n\n${t.hashtags}`} label="COPY SCAFFOLD" small />
          </div>
          <pre style={{ margin: 0, padding: '12px 20px 18px', color: 'rgba(255,255,255,0.72)', fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: sans }}>
            {t.scaffold}
          </pre>

          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 6 }}>WHAT THIS CLAIM IS BUILT ON</div>
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 1.65, fontFamily: sans }}>{t.dataNote}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
