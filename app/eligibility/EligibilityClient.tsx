'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SET_ASIDES } from '@/lib/set-asides'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

type Tri = 'yes' | 'no' | 'unsure'

interface Answers {
  small: Tri | null
  ownership: string[] // 'woman' | 'veteran' | 'sdv' | 'disadvantaged'
  econ: Tri | null
  hubzone: Tri | null
}

const OWNERSHIP_OPTIONS = [
  { key: 'woman', label: '51%+ owned & controlled by one or more women' },
  { key: 'veteran', label: '51%+ owned & controlled by one or more veterans' },
  { key: 'sdv', label: '51%+ owned & controlled by a service-disabled veteran' },
  { key: 'disadvantaged', label: '51%+ owned by socially & economically disadvantaged U.S. citizens' },
]

interface ResultProgram {
  slug: string
  confidence: 'likely' | 'possible'
  note?: string
}

// The quiz is directional, not legal advice — every result links to the full
// program guide with the real requirements and certification path.
function computeResults(a: Answers): ResultProgram[] {
  const out: ResultProgram[] = []
  const small = a.small !== 'no' // "not sure" still shows results, flagged
  if (!small) return out
  const conf = (t: Tri | null): 'likely' | 'possible' => (t === 'yes' ? 'likely' : 'possible')

  out.push({ slug: 'small-business', confidence: conf(a.small), note: a.small === 'unsure' ? 'Check your size standard for your NAICS code at sba.gov — most firms under 500 employees or the revenue cap qualify.' : undefined })

  if (a.ownership.includes('woman')) {
    out.push({ slug: 'wosb', confidence: conf(a.small) })
    if (a.econ !== 'no') {
      out.push({ slug: 'edwosb', confidence: a.econ === 'yes' ? conf(a.small) : 'possible', note: a.econ !== 'yes' ? 'Depends on the owner meeting the economic-disadvantage limits (personal net worth, income, assets).' : undefined })
    }
  }
  if (a.ownership.includes('sdv')) {
    out.push({ slug: 'sdvosb', confidence: conf(a.small) })
    out.push({ slug: 'vosb', confidence: conf(a.small) })
  } else if (a.ownership.includes('veteran')) {
    out.push({ slug: 'vosb', confidence: conf(a.small) })
  }
  if (a.ownership.includes('disadvantaged') && a.econ !== 'no') {
    out.push({ slug: '8a', confidence: a.econ === 'yes' ? 'likely' : 'possible', note: a.econ !== 'yes' ? 'Requires meeting the 8(a) economic-disadvantage limits and typically two years in business.' : undefined })
  }
  if (a.hubzone !== 'no') {
    out.push({
      slug: 'hubzone',
      confidence: a.hubzone === 'yes' ? conf(a.small) : 'possible',
      note: a.hubzone !== 'yes' ? 'Check your address on the SBA HUBZone map — you also need 35% of employees living in a HUBZone.' : undefined,
    })
  }
  return out
}

function TriRow({ value, onChange }: { value: Tri | null; onChange: (v: Tri) => void }) {
  const opts: { v: Tri; label: string }[] = [
    { v: 'yes', label: 'YES' },
    { v: 'no', label: 'NO' },
    { v: 'unsure', label: 'NOT SURE' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{
            padding: '10px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: 'pointer',
            background: value === o.v ? crimson : 'transparent',
            color: value === o.v ? '#fff' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${value === o.v ? crimson : 'rgba(255,255,255,0.15)'}`,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function EligibilityClient() {
  const [answers, setAnswers] = useState<Answers>({ small: null, ownership: [], econ: null, hubzone: null })
  const [showResults, setShowResults] = useState(false)

  const needsEcon = answers.ownership.includes('woman') || answers.ownership.includes('disadvantaged')
  const ready = answers.small !== null && answers.hubzone !== null && (!needsEcon || answers.econ !== null)
  const results = computeResults(answers)

  function toggleOwnership(key: string) {
    setShowResults(false)
    setAnswers(a => ({ ...a, ownership: a.ownership.includes(key) ? a.ownership.filter(k => k !== key) : [...a.ownership, key] }))
  }

  const qLabel: React.CSSProperties = { fontSize: 15, fontWeight: 700, fontFamily: sans, margin: '0 0 6px', color: '#fff' }
  const qHint: React.CSSProperties = { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontFamily: sans, lineHeight: 1.6, margin: '0 0 14px' }
  const qBox: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '26px 28px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>SET-ASIDE ELIGIBILITY CHECK</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Which programs is your business built for?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 560, fontFamily: sans }}>
          Billions in federal work is reserved every year for businesses that qualify for set-aside
          programs. Five questions, no signup, and you&apos;ll know which ones to look at.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={qBox}>
            <p style={qLabel}>Is your business small under SBA size standards?</p>
            <p style={qHint}>
              Size standards are set per NAICS code, by employee count or annual receipts, and most U.S. businesses qualify.
              Confirm yours at sba.gov. Note that SBA has proposed a major overhaul of these thresholds, so a firm that is
              not small today may qualify once it takes effect.
            </p>
            <TriRow value={answers.small} onChange={v => { setShowResults(false); setAnswers(a => ({ ...a, small: v })) }} />
          </div>

          <div style={qBox}>
            <p style={qLabel}>Does any of this describe your ownership?</p>
            <p style={qHint}>Select all that apply — or none.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OWNERSHIP_OPTIONS.map(o => {
                const on = answers.ownership.includes(o.key)
                return (
                  <button key={o.key} type="button" onClick={() => toggleOwnership(o.key)}
                    style={{
                      textAlign: 'left', padding: '13px 16px', fontSize: 13, fontFamily: sans, cursor: 'pointer', lineHeight: 1.5,
                      background: on ? 'rgba(196,18,48,0.1)' : 'transparent',
                      color: on ? '#fff' : 'rgba(255,255,255,0.55)',
                      border: `1px solid ${on ? 'rgba(196,18,48,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                    <span style={{ color: on ? crimson : 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: mono, fontSize: 14, flexShrink: 0 }}>{on ? '◈' : '◇'}</span>
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          {needsEcon && (
            <div style={qBox}>
              <p style={qLabel}>Does the owner meet economic-disadvantage limits?</p>
              <p style={qHint}>For 8(a) and EDWOSB: personal net worth under $850K (excluding home and business), income and total assets under the program caps.</p>
              <TriRow value={answers.econ} onChange={v => { setShowResults(false); setAnswers(a => ({ ...a, econ: v })) }} />
            </div>
          )}

          <div style={qBox}>
            <p style={qLabel}>Is your principal office in a HUBZone?</p>
            <p style={qHint}>Historically Underutilized Business Zones — check your address on the SBA&apos;s HUBZone map. Many rural areas, some urban tracts, and land near closed bases qualify.</p>
            <TriRow value={answers.hubzone} onChange={v => { setShowResults(false); setAnswers(a => ({ ...a, hubzone: v })) }} />
          </div>
        </div>

        <button type="button" disabled={!ready} onClick={() => setShowResults(true)}
          style={{
            marginTop: 24, padding: '15px 36px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono,
            background: ready ? crimson : 'rgba(255,255,255,0.08)', color: ready ? '#fff' : 'rgba(255,255,255,0.25)',
            border: 'none', cursor: ready ? 'pointer' : 'default',
          }}>
          SEE MY PROGRAMS →
        </button>

        {showResults && (
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>YOUR LIKELY PROGRAMS</p>
            {results.length === 0 ? (
              <div style={qBox}>
                <p style={{ ...qLabel, marginBottom: 8 }}>Set-asides need a small business.</p>
                <p style={{ ...qHint, marginBottom: 0 }}>
                  Based on your answers, your business is over the SBA size standards, so set-aside programs are out — but the
                  full-and-open federal market is not, and neither is teaming with small primes as a subcontractor.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map(r => {
                  const program = SET_ASIDES.find(s => s.slug === r.slug)
                  if (!program) return null
                  return (
                    <div key={r.slug} style={{ ...qBox, borderLeft: `3px solid ${r.confidence === 'likely' ? crimson : 'rgba(180,83,9,0.7)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: r.confidence === 'likely' ? crimson : '#b45309', border: `1px solid ${r.confidence === 'likely' ? 'rgba(196,18,48,0.4)' : 'rgba(180,83,9,0.4)'}`, padding: '2px 8px' }}>
                          {r.confidence === 'likely' ? 'LIKELY FIT' : 'POSSIBLE FIT'}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: sans }}>{program.name}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: sans, lineHeight: 1.6, margin: '0 0 10px' }}>{program.tagline}</p>
                      {r.note && <p style={{ fontSize: 12, color: '#b45309', fontFamily: sans, lineHeight: 1.6, margin: '0 0 10px' }}>{r.note}</p>}
                      <Link href={`/set-asides/${program.slug}`} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: crimson, textDecoration: 'none', fontFamily: mono }}>
                        FULL GUIDE + LIVE {program.abbr.toUpperCase()} CONTRACTS →
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.6, margin: '20px 0 0', fontFamily: sans }}>
              Directional only — each program has detailed requirements and a certification process.
              The program guides above spell out both.
            </p>

            <div style={{ marginTop: 40, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
                Now see the contracts reserved for you.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
                Create a free profile with your set-aside status and IR filters the entire federal
                market to what you&apos;re actually eligible to win — scored, ranked, and emailed when
                a real match posts.
              </p>
              <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
                GET MATCHED FREE →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
