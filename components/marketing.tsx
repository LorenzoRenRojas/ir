'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export const mono = 'var(--font-geist-mono, monospace)'
export const sans = 'var(--font-geist-sans, sans-serif)'
export const crimson = '#C41230'
export const surface = '#0A0A0A'

// Fire once when the element scrolls into view — drives all page animations
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

export function CountUp({ to, prefix = '', suffix = '', duration = 1400, started, decimals = 0 }: {
  to: number; prefix?: string; suffix?: string; duration?: number; started: boolean; decimals?: number
}) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!started) return
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, to, duration])

  const shown = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()
  return <>{prefix}{shown}{suffix}</>
}

// Sticky dark nav shared by the marketing detail pages
export function MarketingNav({ section }: { section: string }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 22, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', fontFamily: mono }}>IR</span>
          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, letterSpacing: '0.08em', marginLeft: 4, fontFamily: mono }}>{section}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/how-it-works" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>HOW IT WORKS</Link>
          <Link href="/how-to-win" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>HOW TO WIN</Link>
          <Link href="/capabilities" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>CAPABILITIES</Link>
          <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>PRICING</Link>
          <Link href="/register" style={{ padding: '9px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: crimson, color: '#fff', textDecoration: 'none', fontFamily: mono }}>
            START FREE →
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function MarketingCta({ headline, sub }: { headline: string; sub: string }) {
  return (
    <section style={{ padding: '72px 0 120px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', fontFamily: sans, color: '#fff' }}>
        {headline}
      </h2>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: '0 0 40px', fontFamily: sans }}>{sub}</p>
      <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none', fontFamily: mono }}>
        START FREE →
      </Link>
    </section>
  )
}
