'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

const HALF = Math.PI / 6  // 30°

function geometry(t: number) {
  const fold = Math.sin(t * 0.42) * 0.5 + 0.5
  const g = t * 0.18
  const d = 132

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - HALF * fold + g
    pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + HALF * fold + g
    const r = d * (2 - (2 - Math.sqrt(3)) * fold)
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return pts
}

function buildLines(pts: { x: number; y: number }[]) {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      lines.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y })
    }
  }
  return lines
}

export default function HeroMetatron() {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = performance.now()
    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000
      const svg = svgRef.current
      if (!svg) return

      const pts = geometry(t)
      const lines = buildLines(pts)

      const lineEls = svg.querySelectorAll<SVGLineElement>('[data-mc="line"]')
      lines.forEach((l, i) => {
        const el = lineEls[i]
        if (!el) return
        el.setAttribute('x1', String(l.x1.toFixed(2)))
        el.setAttribute('y1', String(l.y1.toFixed(2)))
        el.setAttribute('x2', String(l.x2.toFixed(2)))
        el.setAttribute('y2', String(l.y2.toFixed(2)))
      })

      const circEls = svg.querySelectorAll<SVGCircleElement>('[data-mc="circle"]')
      pts.forEach((p, i) => {
        const el = circEls[i]
        if (!el) return
        el.setAttribute('cx', String(p.x.toFixed(2)))
        el.setAttribute('cy', String(p.y.toFixed(2)))
      })

      const nodeEls = svg.querySelectorAll<SVGCircleElement>('[data-mc="node"]')
      pts.forEach((p, i) => {
        const el = nodeEls[i]
        if (!el) return
        el.setAttribute('cx', String(p.x.toFixed(2)))
        el.setAttribute('cy', String(p.y.toFixed(2)))
      })

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pre-compute initial frame so server render isn't empty
  const initPts = geometry(0)
  const initLines = buildLines(initPts)

  const mono = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 50%, #1a0404 0%, #0a0101 45%, #000 72%)',
    }}>
      {/* Animated cube — full bleed background */}
      <svg
        ref={svgRef}
        viewBox="-400 -400 800 800"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.92,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mc-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b1" />
            <feGaussianBlur stdDeviation="9" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#mc-glow)" stroke="#ff2a2a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {initPts.map((p, i) => (
            <circle key={`c${i}`} data-mc="circle" cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="66" strokeOpacity="0.13" strokeWidth="1.6" />
          ))}
          {initLines.map((l, i) => (
            <line key={`l${i}`} data-mc="line"
              x1={l.x1.toFixed(2)} y1={l.y1.toFixed(2)}
              x2={l.x2.toFixed(2)} y2={l.y2.toFixed(2)} />
          ))}
          {initPts.map((p, i) => (
            <circle key={`n${i}`} data-mc="node" cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="4.5" fill="#ff2a2a" stroke="none" />
          ))}
        </g>
      </svg>

      {/* Text content — centered on top */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '0 24px',
        maxWidth: 820,
      }}>
        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
          <span style={{ color: '#4ADE80', fontSize: 10, letterSpacing: '0.14em', fontFamily: mono }}>
            LIVE — SAM.GOV FEED ACTIVE
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(42px, 6vw, 88px)',
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: '-0.03em',
          margin: '0 0 10px',
          color: '#ffffff',
          textShadow: '0 0 40px rgba(0,0,0,0.8)',
        }}>
          When you were young,
        </h1>
        <h1 style={{
          fontSize: 'clamp(42px, 6vw, 88px)',
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: '-0.03em',
          margin: '0 0 40px',
          color: crimson,
          textShadow: `0 0 60px rgba(196,18,48,0.5)`,
        }}>
          you dreamed of shaping the world.
        </h1>

        <p style={{
          fontSize: 18,
          lineHeight: 1.8,
          color: 'rgba(255,255,255,0.65)',
          maxWidth: 580,
          margin: '0 auto 14px',
          textShadow: '0 0 20px rgba(0,0,0,0.9)',
        }}>
          Not just your corner of it —{' '}
          <span style={{ color: '#ffffff', fontWeight: 600 }}>the whole world.</span>{' '}
          IR connects mission-driven companies to $847 billion in federal opportunities.
        </p>

        <p style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.3)',
          maxWidth: 460,
          margin: '0 auto 52px',
          fontFamily: mono,
          letterSpacing: '0.04em',
        }}>
          Every active federal solicitation. Scored against your company profile. Delivered in under 100ms.
        </p>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '14px 32px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            background: crimson,
            color: '#fff',
            textDecoration: 'none',
            fontFamily: mono,
            display: 'inline-block',
          }}>
            START MATCHING →
          </Link>
          <Link href="#how" style={{
            padding: '13px 28px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
            fontFamily: mono,
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'inline-block',
          }}>
            SEE HOW IT WORKS
          </Link>
        </div>
      </div>

      {/* Fade to black at the bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        background: 'linear-gradient(to bottom, transparent, #000)',
        pointerEvents: 'none',
      }} />
    </section>
  )
}
