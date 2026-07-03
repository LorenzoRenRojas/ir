'use client'

import { useEffect, useRef } from 'react'

// The folding Metatron's Cube from the landing hero, packaged as a fixed
// full-viewport backdrop for dark marketing pages. Content renders above it
// (zIndex >= 1); the cube stays pinned and animates behind everything.

const HALF = Math.PI / 6
const D = 132

function geometry(t: number) {
  const fold = Math.sin(t * 0.42) * 0.5 + 0.5
  const g = t * 0.18
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - HALF * fold + g
    pts.push({ x: Math.cos(a) * D, y: Math.sin(a) * D })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + HALF * fold + g
    const r = D * (2 - (2 - Math.sqrt(3)) * fold)
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return pts
}

const INIT_PTS = geometry(0)

// pulse: slowly breathe between near-invisible and glowing-visible
export default function MetatronBackdrop({ opacity = 0.22, pulse = false }: { opacity?: number; pulse?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const lineEls = useRef<SVGLineElement[]>([])
  const circEls = useRef<SVGCircleElement[]>([])
  const nodeEls = useRef<SVGCircleElement[]>([])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    lineEls.current = Array.from(svg.querySelectorAll<SVGLineElement>('[data-mb="line"]'))
    circEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mb="circle"]'))
    nodeEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mb="node"]'))
    startRef.current = performance.now()

    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000
      const pts = geometry(t)

      for (let i = 0; i < pts.length; i++) {
        const cx = pts[i].x.toFixed(1)
        const cy = pts[i].y.toFixed(1)
        circEls.current[i]?.setAttribute('cx', cx)
        circEls.current[i]?.setAttribute('cy', cy)
        nodeEls.current[i]?.setAttribute('cx', cx)
        nodeEls.current[i]?.setAttribute('cy', cy)
      }

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

  const initLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < INIT_PTS.length; i++) {
    for (let j = i + 1; j < INIT_PTS.length; j++) {
      initLines.push({ x1: INIT_PTS[i].x, y1: INIT_PTS[i].y, x2: INIT_PTS[j].x, y2: INIT_PTS[j].y })
    }
  }

  return (
    <>
      {pulse && (
        <style>{`
          @keyframes metatronPulse {
            0%   { opacity: 0.03; filter: drop-shadow(0 0 0px rgba(196,18,48,0)); }
            50%  { opacity: 0.5;  filter: drop-shadow(0 0 18px rgba(196,18,48,0.55)); }
            100% { opacity: 0.03; filter: drop-shadow(0 0 0px rgba(196,18,48,0)); }
          }
        `}</style>
      )}
    <svg
      ref={svgRef}
      viewBox="-400 -400 800 800"
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        opacity: pulse ? undefined : opacity,
        animation: pulse ? 'metatronPulse 7s ease-in-out infinite' : undefined,
        zIndex: 0, pointerEvents: 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="#C41230" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {INIT_PTS.map((p, i) => (
          <circle key={`c${i}`} data-mb="circle" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="66" strokeOpacity="0.12" strokeWidth="1.0" />
        ))}
        {initLines.map((l, i) => (
          <line key={`l${i}`} data-mb="line" x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)} x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)} strokeWidth="1.0" strokeOpacity="0.28" />
        ))}
        {INIT_PTS.map((p, i) => (
          <circle key={`n${i}`} data-mb="node" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill="#C41230" stroke="none" fillOpacity="0.7" />
        ))}
      </g>
    </svg>
    </>
  )
}
