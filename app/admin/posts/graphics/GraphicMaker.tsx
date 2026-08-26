'use client'

import { useState } from 'react'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// Presets are starting points, not the limit — every field stays editable so a
// graphic can be made for any number the data actually supports.
const PRESETS: { name: string; stat: string; label: string; sub: string }[] = [
  { name: 'Market volume', stat: '1,247', label: 'SOLICITATIONS TRACKED THIS WEEK', sub: '38% carry a small-business set-aside' },
  { name: 'Speed claim', stat: '5 min', label: 'VS WEEKS OF MANUAL CAPTURE WORK', sub: 'Scored, sourced, and explained' },
  { name: 'Closing soon', stat: '212', label: 'TRACKED CONTRACTS CLOSING IN 7 DAYS', sub: '84 carry small-business set-asides' },
  { name: 'Set-asides open', stat: '3,410', label: 'TRACKED SET-ASIDE CONTRACTS', sub: 'Open to small business right now' },
  { name: 'Price of an analyst', stat: '$120K', label: 'WHAT A CAPTURE ANALYST COSTS', sub: 'Per year, before benefits' },
]

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0A0A0A',
  border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
  fontSize: 13, fontFamily: sans, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.35)', marginBottom: 7, fontFamily: mono,
}

export default function GraphicMaker() {
  const [stat, setStat] = useState('1,247')
  const [label, setLabel] = useState('SOLICITATIONS TRACKED THIS WEEK')
  const [sub, setSub] = useState('38% carry a small-business set-aside')

  const url = `/api/post-image?stat=${encodeURIComponent(stat)}&label=${encodeURIComponent(label)}&sub=${encodeURIComponent(sub)}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(240px, 340px)', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={lbl}>PRESETS</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.name} type="button"
                onClick={() => { setStat(p.stat); setLabel(p.label); setSub(p.sub) }}
                style={{ padding: '7px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                {p.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={lbl}>THE NUMBER (max 14 chars)</label>
          <input value={stat} maxLength={14} onChange={e => setStat(e.target.value)} style={{ ...field, fontSize: 22, fontWeight: 800, fontFamily: mono }} />
        </div>
        <div>
          <label style={lbl}>LABEL (max 46 chars)</label>
          <input value={label} maxLength={46} onChange={e => setLabel(e.target.value)} style={field} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 5, fontFamily: mono }}>{label.length}/46 · renders uppercase</div>
        </div>
        <div>
          <label style={lbl}>SUBLINE (max 90 chars)</label>
          <input value={sub} maxLength={90} onChange={e => setSub(e.target.value)} style={field} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 5, fontFamily: mono }}>{sub.length}/90</div>
        </div>

        <div style={{ padding: '14px 16px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.05)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: crimson, marginBottom: 7, fontFamily: mono }}>BEFORE YOU POST IT</div>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: sans }}>
            Whatever number you put here becomes a public claim under your name. Use figures you can
            source from the admin board or the drafts — and phrase market volume as what IR tracked,
            since the store is a synced subset of SAM.gov rather than a complete census.
          </p>
        </div>
      </div>

      <div>
        <label style={lbl}>PREVIEW · 1200×1200</label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={url} src={url} alt="" width={320} height={320} style={{ border: '1px solid rgba(255,255,255,0.12)', display: 'block', width: '100%', height: 'auto' }} />
        <a href={url} download="ir-graphic.png"
          style={{ display: 'block', marginTop: 12, padding: '11px', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: crimson, textDecoration: 'none', fontFamily: mono }}>
          DOWNLOAD PNG
        </a>
        <p style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.28)', marginTop: 12, fontFamily: sans }}>
          Square, because it takes the most vertical space in a LinkedIn feed. Image posts consistently
          out-reach text alone.
        </p>
      </div>
    </div>
  )
}
