'use client'

import { useEffect, useRef, useState } from 'react'
import type { MatchScoreBreakdown, FactorBreakdown } from '@/lib/matching'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const VERDICT_STYLE: Record<FactorBreakdown['verdict'], { label: string; color: string; bg: string }> = {
  full:    { label: 'MATCHED',  color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  partial: { label: 'PARTIAL',  color: '#b45309', bg: 'rgba(180,83,9,0.08)' },
  neutral: { label: 'NEUTRAL',  color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  miss:    { label: 'MISSED',   color: crimson,   bg: 'rgba(196,18,48,0.06)' },
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function CountUp({ to, started, duration = 1100 }: { to: number; started: boolean; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started) return
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, to, duration])
  return <>{val}</>
}

export default function ScoreBreakdown({ breakdown }: { breakdown: MatchScoreBreakdown }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  const total = breakdown.total
  const totalColor = total >= 80 ? '#16a34a' : total >= 60 ? crimson : '#64748b'

  const verdictLine =
    total >= 80 ? 'Strong match — this is squarely in your lane. Worth serious pursuit.'
    : total >= 60 ? 'Solid match — competitive fit with some gaps. Read the misses below before committing.'
    : total >= 40 ? 'Marginal fit — pursuable, but you\'d be stretching on the factors marked below.'
    : 'Weak fit — the fundamentals don\'t line up. Usually better to spend this time elsewhere.'

  return (
    <div ref={ref} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '32px', marginBottom: 12 }}>
      {/* Header: big score + segmented bar */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: mono, marginBottom: 20 }}>
        MATCH ANALYSIS — YOUR PROFILE VS THIS CONTRACT
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 64, fontWeight: 800, color: totalColor, fontFamily: sans, lineHeight: 1, letterSpacing: '-0.03em' }}>
            <CountUp to={total} started={inView} />
          </span>
          <span style={{ fontSize: 18, color: 'rgba(0,0,0,0.25)', marginLeft: 6, fontFamily: mono }}>/100</span>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', fontFamily: sans, margin: '0 0 8px', lineHeight: 1.6, maxWidth: 520 }}>
          {verdictLine}
        </p>
      </div>

      {/* Segmented total bar — each factor is a segment, filled by what it earned */}
      <div style={{ display: 'flex', gap: 3, height: 10, marginBottom: 28 }}>
        {breakdown.factors.map((f, i) => (
          <div key={f.key} style={{ width: `${f.max}%`, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: inView ? `${(f.score / f.max) * 100}%` : '0%',
                background: VERDICT_STYLE[f.verdict].color,
                transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 150 + 200}ms`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Factor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {breakdown.factors.map((f, i) => {
          const v = VERDICT_STYLE[f.verdict]
          return (
            <div
              key={f.key}
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderTop: `3px solid ${v.color}`,
                padding: '20px 22px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 130 + 300}ms`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.55)' }}>{f.label}</span>
                <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: v.color, background: v.bg, padding: '3px 8px' }}>{v.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: sans, fontSize: 26, fontWeight: 800, color: '#0A0A0A' }}>
                  <CountUp to={f.score} started={inView} duration={900} />
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>/ {f.max} PTS</span>
              </div>

              <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: inView ? `${(f.score / f.max) * 100}%` : '0%', background: v.color, transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 130 + 450}ms` }} />
              </div>

              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(0,0,0,0.55)', fontFamily: sans, margin: '0 0 14px' }}>
                {f.explanation}
              </p>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: crimson, flexShrink: 0, marginTop: 2 }}>YOU</span>
                  <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.45)', fontFamily: sans, lineHeight: 1.5 }}>{f.yours}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.35)', flexShrink: 0, marginTop: 2 }}>THEM</span>
                  <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.45)', fontFamily: sans, lineHeight: 1.5 }}>{f.theirs}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
