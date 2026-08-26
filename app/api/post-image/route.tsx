import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

// Branded post artwork, 1200x1200.
//
// Square because it takes the most vertical space in a LinkedIn feed, and an
// image post out-performs text alone by a wide margin. Everything is driven by
// query params so the studio can render any stat without a second DB round
// trip, and so the runtime stays edge-safe (no Prisma in here).

export const runtime = 'edge'

const CRIMSON = '#C41230'
const INK = '#0A0A0A'

// Hexagon-plus-centre lattice from app/icon.svg, in a 32-unit space.
const NODES: [number, number][] = [
  [16, 16], [25.09, 10.75], [25.09, 21.25],
  [16, 26.5], [6.91, 21.25], [6.91, 10.75], [16, 5.5],
]

function latticePath(scale: number, cx: number, cy: number): string {
  const p: string[] = []
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const a = NODES[i], b = NODES[j]
      p.push(
        `M${(a[0] - 16) * scale + cx} ${(a[1] - 16) * scale + cy}` +
        `L${(b[0] - 16) * scale + cx} ${(b[1] - 16) * scale + cy}`
      )
    }
  }
  return p.join('')
}

const clamp = (s: string | null, max: number, fallback = '') =>
  (s ?? fallback).slice(0, max)

// Article cover: 1920x1080, headline-led rather than number-led. LinkedIn's
// article editor wants a wide image and gives the headline real estate, so the
// square stat treatment would waste it.
function articleCover(headline: string, eyebrow: string, deck: string) {
  // Long headlines have to step down or they run into the deck.
  const size = headline.length <= 42 ? 104 : headline.length <= 62 ? 84 : 68

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', background: INK, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '86px 96px', position: 'relative',
        }}
      >
        <svg
          width="1150" height="1150" viewBox="0 0 1150 1150"
          style={{ position: 'absolute', right: -330, top: -120, opacity: 0.12 }}
        >
          <path d={latticePath(17, 575, 575)} stroke={CRIMSON} strokeWidth={3.5} fill="none" />
          {NODES.map((nd, i) => (
            <circle key={i} cx={(nd[0] - 16) * 17 + 575} cy={(nd[1] - 16) * 17 + 575} r={14} fill={CRIMSON} />
          ))}
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            <path d={latticePath(1.35, 23, 23)} stroke={CRIMSON} strokeWidth={1.5} fill="none" opacity={0.8} />
            {NODES.map((nd, i) => (
              <circle key={i} cx={(nd[0] - 16) * 1.35 + 23} cy={(nd[1] - 16) * 1.35 + 23} r={2.4} fill={CRIMSON} />
            ))}
          </svg>
          <div style={{ color: '#fff', fontSize: 27, fontWeight: 800, letterSpacing: 4 }}>IR</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15, letterSpacing: 3.5 }}>{eyebrow}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1220 }}>
          <div style={{ display: 'flex', width: 96, height: 6, background: CRIMSON, marginBottom: 38 }} />
          <div style={{ color: '#fff', fontSize: size, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.12 }}>
            {headline}
          </div>
          {deck ? (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 30, lineHeight: 1.5, marginTop: 30, maxWidth: 1080 }}>
              {deck}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, letterSpacing: 2 }}>IR-GOV.APP</div>
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 18, letterSpacing: 1.5 }}>LORENZO ROJAS · FOUNDER</div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  )
}

export function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams

  if (q.get('mode') === 'article') {
    return articleCover(
      clamp(q.get('headline'), 90, 'Untitled'),
      clamp(q.get('eyebrow'), 40, 'GOVCON INTELLIGENCE').toUpperCase(),
      clamp(q.get('deck'), 150)
    )
  }

  // ASCII only in fallbacks: the default OG font has no em-dash glyph, so a
  // missing stat rendered as a tofu box instead of anything readable.
  const stat = clamp(q.get('stat'), 14, 'n/a')
  const label = clamp(q.get('label'), 46, 'FEDERAL MARKET').toUpperCase()
  const sub = clamp(q.get('sub'), 90)

  // Long numbers need to shrink or they collide with the frame.
  const statSize = stat.length <= 4 ? 300 : stat.length <= 7 ? 220 : 150

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', background: INK, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: 72, position: 'relative',
        }}
      >
        {/* Watermark lattice, bleeding off the bottom-right corner */}
        <svg
          width="900" height="900" viewBox="0 0 900 900"
          style={{ position: 'absolute', right: -260, bottom: -260, opacity: 0.13 }}
        >
          <path d={latticePath(13, 450, 450)} stroke={CRIMSON} strokeWidth={3} fill="none" />
          {NODES.map((nd, i) => (
            <circle key={i} cx={(nd[0] - 16) * 13 + 450} cy={(nd[1] - 16) * 13 + 450} r={11} fill={CRIMSON} />
          ))}
        </svg>

        {/* Brand line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <path d={latticePath(1.5, 26, 26)} stroke={CRIMSON} strokeWidth={1.6} fill="none" opacity={0.8} />
            {NODES.map((nd, i) => (
              <circle key={i} cx={(nd[0] - 16) * 1.5 + 26} cy={(nd[1] - 16) * 1.5 + 26} r={2.6} fill={CRIMSON} />
            ))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>IR</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, letterSpacing: 3 }}>GOVCON INTELLIGENCE</div>
          </div>
        </div>

        {/* The number */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#fff', fontSize: statSize, fontWeight: 800,
              letterSpacing: -6, lineHeight: 1,
            }}
          >
            {stat}
          </div>
          <div style={{ display: 'flex', width: 110, height: 7, background: CRIMSON, marginTop: 34, marginBottom: 30 }} />
          <div style={{ color: CRIMSON, fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>{label}</div>
          {sub ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 27, marginTop: 18, maxWidth: 900 }}>{sub}</div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 21, letterSpacing: 2 }}>IR-GOV.APP</div>
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 18, letterSpacing: 1.5 }}>SOURCE: SAM.GOV</div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200 }
  )
}
