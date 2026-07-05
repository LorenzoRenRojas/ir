'use client'

import { useEffect, useRef } from 'react'
import { metatronFrame } from '@/lib/metatron-motion'



const INIT_PTS = metatronFrame(0).pts

const initLines: { x1: number; y1: number; x2: number; y2: number }[] = []
for (let i = 0; i < INIT_PTS.length; i++) {
  for (let j = i + 1; j < INIT_PTS.length; j++) {
    initLines.push({ x1: INIT_PTS[i].x, y1: INIT_PTS[i].y, x2: INIT_PTS[j].x, y2: INIT_PTS[j].y })
  }
}

const crimson = '#C41230'

export default function MetatronAvatar({ size = 90 }: { size?: number }) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const rafRef  = useRef<number>(0)
  const startRef = useRef<number>(0)
  const lineEls  = useRef<SVGLineElement[]>([])
  const circEls  = useRef<SVGCircleElement[]>([])
  const nodeEls  = useRef<SVGCircleElement[]>([])
  const lidRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    lineEls.current = Array.from(svg.querySelectorAll<SVGLineElement>('[data-mc="line"]'))
    circEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mc="circle"]'))
    nodeEls.current = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mc="node"]'))

    startRef.current = performance.now()

    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000
      const { pts, pupilR, lidOpacity, lid } = metatronFrame(t)

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

  return (
    <svg
      ref={svgRef}
      viewBox="-400 -400 800 800"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={crimson} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {INIT_PTS.map((p, i) => (
          <circle key={`c${i}`} data-mc="circle"
            cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
            r="66" strokeOpacity="0.18" strokeWidth="1.0" />
        ))}
        {initLines.map((l, i) => (
          <line key={`l${i}`} data-mc="line"
            x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)}
            x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
            strokeWidth="1.0" strokeOpacity="0.5" />
        ))}
        {INIT_PTS.map((p, i) => (
          <circle key={`n${i}`} data-mc="node"
            cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
            r="4" fill={crimson} stroke="none" fillOpacity="0.9" />
        ))}
        <path ref={lidRef} d="" fill="none" strokeWidth="5" strokeOpacity="0" />
      </g>
    </svg>
  )
}
