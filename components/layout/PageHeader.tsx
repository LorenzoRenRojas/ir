import type { ReactNode } from 'react'

// Shared app-screen chrome so every workspace view reads as one product:
// a quiet mono kicker with a crimson index tick, a confident Archivo title,
// an optional subtitle, and a right-aligned slot for actions/status. One clear
// focal point per screen — the opposite of the old stacked-labels density.

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function PageHeader({ kicker, title, subtitle, right }: {
  kicker: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <span style={{ width: 16, height: 2, background: crimson, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', color: 'rgba(0,0,0,0.4)' }}>{kicker}</span>
        </div>
        <h1 style={{ fontFamily: sans, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', margin: 0, lineHeight: 1.04 }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: sans, fontSize: 13.5, color: 'rgba(0,0,0,0.45)', margin: '10px 0 0', maxWidth: 580, lineHeight: 1.55 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export type ReadoutAccent = 'crimson' | 'amber' | 'green' | 'muted'
export interface Readout { label: string; value: string; accent?: ReadoutAccent }

const accentColor = (a?: ReadoutAccent) =>
  a === 'crimson' ? crimson : a === 'amber' ? '#b45309' : a === 'green' ? '#16a34a' : '#0A0A0A'

// A precise "readout" strip — divided cells, each a small label over a big
// Archivo figure, first cell ticked in crimson. Gives each screen a calm focal
// point and a premium, instrument-panel feel.
export function StatStrip({ items }: { items: Readout[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: '17px 20px', borderLeft: i ? '1px solid rgba(0,0,0,0.06)' : 'none', position: 'relative' }}>
          {i === 0 && <span style={{ position: 'absolute', top: 0, left: 0, width: 30, height: 2, background: crimson }} />}
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
          <div style={{ fontFamily: sans, fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', color: accentColor(it.accent), lineHeight: 1 }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}
