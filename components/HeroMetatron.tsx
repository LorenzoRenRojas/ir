'use client'

import { useEffect, useRef } from 'react'
import { metatronFrame } from '@/lib/metatron-motion'
import Link from 'next/link'



// Pre-build the initial frame for SSR (avoids empty first paint)
const INIT_PTS = metatronFrame(0).pts
const N_LINES = (INIT_PTS.length * (INIT_PTS.length - 1)) / 2

export default function HeroMetatron() {
  const svgRef  = useRef<SVGSVGElement>(null)
  const rafRef  = useRef<number>(0)
  const startRef = useRef<number>(0)
  // Cached element arrays — populated once after mount
  const lineEls  = useRef<SVGLineElement[]>([])
  const circEls  = useRef<SVGCircleElement[]>([])
  const nodeEls  = useRef<SVGCircleElement[]>([])
  const lidRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    // Cache once — never query again inside the loop
    lineEls.current = Array.from(svg.querySelectorAll<SVGLineElement>('[data-mc="line"]'))
    circEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mc="circle"]'))
    nodeEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mc="node"]'))

    startRef.current = performance.now()

    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000
      const { pts, pupilR, lidOpacity, lid } = metatronFrame(t)

      // Update circles & nodes
      for (let i = 0; i < pts.length; i++) {
        const cx = pts[i].x.toFixed(1)
        const cy = pts[i].y.toFixed(1)
        circEls.current[i]?.setAttribute('cx', cx)
        circEls.current[i]?.setAttribute('cy', cy)
        nodeEls.current[i]?.setAttribute('cx', cx)
        nodeEls.current[i]?.setAttribute('cy', cy)
      }

      // The Eye: center node dilates into the pupil; the upper lid draws in
      nodeEls.current[0]?.setAttribute('r', pupilR.toFixed(1))
      if (lidRef.current) {
        lidRef.current.setAttribute('d', 'M' + lid.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L'))
        lidRef.current.setAttribute('stroke-opacity', lidOpacity.toFixed(2))
      }

      // Update lines
      let li = 0
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const el = lineEls.current[li++]
          if (!el) continue
          el.setAttribute('x1', pts[i].x.toFixed(1))
          el.setAttribute('y1', pts[i].y.toFixed(1))
          el.setAttribute('x2', pts[j].x.toFixed(1))
          el.setAttribute('y2', pts[j].y.toFixed(1))
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const mono    = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'

  // Build initial line positions for SSR
  const initLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < INIT_PTS.length; i++) {
    for (let j = i + 1; j < INIT_PTS.length; j++) {
      initLines.push({ x1: INIT_PTS[i].x, y1: INIT_PTS[i].y, x2: INIT_PTS[j].x, y2: INIT_PTS[j].y })
    }
  }

  return (
    <section style={{
      position: 'relative',
      minHeight: '92vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
    }}>
      {/* Cube — fixed watermark, never moves, always visible through every section */}
      <svg
        ref={svgRef}
        viewBox="-400 -400 800 800"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.38,
          zIndex: 0,
          pointerEvents: 'none',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke={crimson} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Fruit-of-life circles */}
          {INIT_PTS.map((p, i) => (
            <circle key={`c${i}`} data-mc="circle"
              cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
              r="66" strokeOpacity="0.1" strokeWidth="1.0" />
          ))}
          {/* All 78 connecting lines */}
          {initLines.map((l, i) => (
            <line key={`l${i}`} data-mc="line"
              x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)}
              x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
              strokeWidth="1.0" strokeOpacity="0.25" />
          ))}
          {/* Node dots */}
          {INIT_PTS.map((p, i) => (
            <circle key={`n${i}`} data-mc="node"
              cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
              r="4" fill={crimson} stroke="none" fillOpacity="0.65" />
          ))}
          <path ref={lidRef} d="" fill="none" strokeWidth="5" strokeOpacity="0" />
        </g>
      </svg>

      {/* Centered text — sits above the fixed cube */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '0 24px',
        maxWidth: 820,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
          <span style={{ color: '#16a34a', fontSize: 10, letterSpacing: '0.14em', fontFamily: mono }}>
            LIVE — SAM.GOV FEED ACTIVE
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 5.5vw, 82px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
          color: '#0A0A0A',
        }}>
          The government buys
        </h1>
        <h1 style={{
          fontSize: 'clamp(40px, 5.5vw, 82px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          margin: '0 0 36px',
          color: crimson,
        }}>
          $2 billion a day.
        </h1>

        <p style={{
          fontSize: 18,
          lineHeight: 1.8,
          color: 'rgba(0,0,0,0.52)',
          maxWidth: 580,
          margin: '0 auto 14px',
        }}>
          <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Go take your share.</span>{' '}
          IR finds the federal contracts your company can actually win, alerts you the day they post,
          and drafts the proposal.
        </p>

        <p style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: 'rgba(0,0,0,0.32)',
          maxWidth: 480,
          margin: '0 auto 48px',
          fontFamily: mono,
          letterSpacing: '0.03em',
        }}>
          MATCH SCORING · WIN PROBABILITY · DAILY ALERTS · PROPOSAL DRAFTS — ONE TERMINAL
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary">START FREE →</Link>
          <Link href="#how" className="btn-ghost">SEE HOW IT WORKS</Link>
        </div>
      </div>
    </section>
  )
}
