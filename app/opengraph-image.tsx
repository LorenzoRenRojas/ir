import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'IR — Government Contract Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 100px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Top-left wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 60 }}>
          <div style={{
            width: 40, height: 40,
            background: '#C41230',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 14, height: 24, background: '#0A0A0A', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 4, background: '#ffffff', borderRadius: 1 }} />
              <div style={{ flex: 1, width: 6, background: '#ffffff', alignSelf: 'center' }} />
              <div style={{ height: 4, background: '#ffffff', borderRadius: 1 }} />
            </div>
          </div>
          <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, letterSpacing: '0.16em' }}>
            IR
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.12em', marginLeft: 4 }}>
            GOVCON INTELLIGENCE
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
          <span style={{
            color: '#ffffff',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            Find the contracts
          </span>
          <span style={{
            color: '#C41230',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            you were built to win.
          </span>
        </div>

        {/* Sub-copy */}
        <span style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 22,
          lineHeight: 1.6,
          maxWidth: 640,
          letterSpacing: '0.01em',
        }}>
          AI-matched federal opportunities from SAM.gov, scored against your company profile. Built for small businesses and set-aside firms.
        </span>

        {/* Bottom right — live indicator */}
        <div style={{
          position: 'absolute',
          right: 100,
          bottom: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} />
          <span style={{ color: '#4ADE80', fontSize: 12, letterSpacing: '0.14em' }}>
            LIVE SAM.GOV FEED
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
