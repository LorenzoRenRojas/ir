import type { CapturePlaybook as Playbook } from '@/lib/capture'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const ELIGIBILITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  eligible:   { color: '#16a34a', bg: 'rgba(22,163,74,0.06)',  border: 'rgba(22,163,74,0.25)' },
  open:       { color: '#b45309', bg: 'rgba(180,83,9,0.05)',   border: 'rgba(180,83,9,0.22)' },
  ineligible: { color: crimson,   bg: 'rgba(196,18,48,0.05)',  border: 'rgba(196,18,48,0.22)' },
  unknown:    { color: 'rgba(0,0,0,0.4)', bg: 'rgba(0,0,0,0.02)', border: 'rgba(0,0,0,0.1)' },
}

const TONE_MARK: Record<string, { mark: string; color: string }> = {
  do:    { mark: '→', color: crimson },
  watch: { mark: '!', color: '#b45309' },
  info:  { mark: '·', color: 'rgba(0,0,0,0.35)' },
}

export default function CapturePlaybook({ playbook }: { playbook: Playbook }) {
  const el = ELIGIBILITY_STYLE[playbook.eligibility] ?? ELIGIBILITY_STYLE.unknown

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 8 }}>
        CAPTURE PLAYBOOK
      </div>
      <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: sans, margin: '0 0 20px', lineHeight: 1.6 }}>
        How to actually pursue this — not just whether it fits.
      </p>

      {/* Eligibility verdict */}
      <div style={{ padding: '14px 16px', background: el.bg, border: `1px solid ${el.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: el.color, fontFamily: mono, marginBottom: 6 }}>
          {playbook.eligibilityLabel.toUpperCase()}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.6)', fontFamily: sans, lineHeight: 1.7 }}>
          {playbook.eligibilityDetail}
        </div>
      </div>

      {/* Signals */}
      {playbook.signals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 10 }}>SIGNALS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {playbook.signals.map((s, i) => {
              const t = TONE_MARK[s.tone]
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: t.color, fontWeight: 700, fontFamily: mono, fontSize: 12, lineHeight: 1.6 }}>{t.mark}</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.6)', fontFamily: sans, lineHeight: 1.6 }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next moves */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>YOUR NEXT MOVES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {playbook.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < playbook.steps.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: crimson, fontFamily: mono, width: 20, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: sans, marginBottom: 3 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: sans, lineHeight: 1.6 }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
