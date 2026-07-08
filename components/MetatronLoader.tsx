'use client'

import { useEffect, useRef } from 'react'
import { metatronFrame } from '@/lib/metatron-motion'

// The folding cube from the landing hero, packaged as a loading indicator.
// Inline (not fixed) so it can sit inside any loading state — dashboards,
// route-level loading.tsx files, panel spinners.

const INIT_PTS = metatronFrame(0).pts

export default function MetatronLoader({
  size = 140,
  label = 'LOADING…',
  color = '#C41230',
  labelColor = 'rgba(0,0,0,0.3)',
}: {
  size?: number
  label?: string
  color?: string
  labelColor?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const lineEls = useRef<SVGLineElement[]>([])
  const nodeEls = useRef<SVGCircleElement[]>([])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    lineEls.current = Array.from(svg.querySelectorAll<SVGLineElement>('[data-ml="line"]'))
    nodeEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-ml="node"]'))
    startRef.current = performance.now()

    const loop = () => {
      // 2.2x speed — a loader should feel busier than a backdrop
      const t = ((performance.now() - startRef.current) / 1000) * 2.2
      const { pts } = metatronFrame(t)

      for (let i = 0; i < pts.length; i++) {
        nodeEls.current[i]?.setAttribute('cx', pts[i].x.toFixed(1))
        nodeEls.current[i]?.setAttribute('cy', pts[i].y.toFixed(1))
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <svg
        ref={svgRef}
        viewBox="-300 -300 600 600"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading"
        role="status"
      >
        <g stroke={color} strokeLinecap="round" fill="none">
          {initLines.map((l, i) => (
            <line key={`l${i}`} data-ml="line"
              x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)}
              x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
              strokeWidth="1.4" strokeOpacity="0.35" />
          ))}
          {INIT_PTS.map((p, i) => (
            <circle key={`n${i}`} data-ml="node"
              cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
              r="7" fill={color} stroke="none" fillOpacity="0.8" />
          ))}
        </g>
      </svg>
      {label && (
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: labelColor, fontFamily: 'var(--font-geist-mono, monospace)' }}>
          {label}
        </div>
      )}
    </div>
  )
}
