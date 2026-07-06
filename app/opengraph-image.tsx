import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'IR — Government Contract Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The lattice mark (half-fold, flat-top pose) precomputed as one path
const LATTICE = 'M0.0 0.0L114.3 -66.0M0.0 0.0L114.3 66.0M0.0 0.0L0.0 132.0M0.0 0.0L-114.3 66.0M0.0 0.0L-114.3 -66.0M0.0 0.0L0.0 -132.0M0.0 0.0L246.3 0.0M0.0 0.0L123.2 213.3M0.0 0.0L-123.2 213.3M0.0 0.0L-246.3 0.0M0.0 0.0L-123.2 -213.3M0.0 0.0L123.2 -213.3M114.3 -66.0L114.3 66.0M114.3 -66.0L0.0 132.0M114.3 -66.0L-114.3 66.0M114.3 -66.0L-114.3 -66.0M114.3 -66.0L0.0 -132.0M114.3 -66.0L246.3 0.0M114.3 -66.0L123.2 213.3M114.3 -66.0L-123.2 213.3M114.3 -66.0L-246.3 0.0M114.3 -66.0L-123.2 -213.3M114.3 -66.0L123.2 -213.3M114.3 66.0L0.0 132.0M114.3 66.0L-114.3 66.0M114.3 66.0L-114.3 -66.0M114.3 66.0L0.0 -132.0M114.3 66.0L246.3 0.0M114.3 66.0L123.2 213.3M114.3 66.0L-123.2 213.3M114.3 66.0L-246.3 0.0M114.3 66.0L-123.2 -213.3M114.3 66.0L123.2 -213.3M0.0 132.0L-114.3 66.0M0.0 132.0L-114.3 -66.0M0.0 132.0L0.0 -132.0M0.0 132.0L246.3 0.0M0.0 132.0L123.2 213.3M0.0 132.0L-123.2 213.3M0.0 132.0L-246.3 0.0M0.0 132.0L-123.2 -213.3M0.0 132.0L123.2 -213.3M-114.3 66.0L-114.3 -66.0M-114.3 66.0L0.0 -132.0M-114.3 66.0L246.3 0.0M-114.3 66.0L123.2 213.3M-114.3 66.0L-123.2 213.3M-114.3 66.0L-246.3 0.0M-114.3 66.0L-123.2 -213.3M-114.3 66.0L123.2 -213.3M-114.3 -66.0L0.0 -132.0M-114.3 -66.0L246.3 0.0M-114.3 -66.0L123.2 213.3M-114.3 -66.0L-123.2 213.3M-114.3 -66.0L-246.3 0.0M-114.3 -66.0L-123.2 -213.3M-114.3 -66.0L123.2 -213.3M0.0 -132.0L246.3 0.0M0.0 -132.0L123.2 213.3M0.0 -132.0L-123.2 213.3M0.0 -132.0L-246.3 0.0M0.0 -132.0L-123.2 -213.3M0.0 -132.0L123.2 -213.3M246.3 0.0L123.2 213.3M246.3 0.0L-123.2 213.3M246.3 0.0L-246.3 0.0M246.3 0.0L-123.2 -213.3M246.3 0.0L123.2 -213.3M123.2 213.3L-123.2 213.3M123.2 213.3L-246.3 0.0M123.2 213.3L-123.2 -213.3M123.2 213.3L123.2 -213.3M-123.2 213.3L-246.3 0.0M-123.2 213.3L-123.2 -213.3M-123.2 213.3L123.2 -213.3M-246.3 0.0L-123.2 -213.3M-246.3 0.0L123.2 -213.3M-123.2 -213.3L123.2 -213.3'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 90px',
          fontFamily: 'monospace',
        }}
      >
        {/* The mark */}
        <svg width="430" height="430" viewBox="-290 -290 580 580">
          <path d={LATTICE} stroke="#C41230" strokeWidth="3" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
          <circle cx="0.0" cy="0.0" r="8" fill="#C41230" />
          <circle cx="114.3" cy="-66.0" r="8" fill="#C41230" />
          <circle cx="114.3" cy="66.0" r="8" fill="#C41230" />
          <circle cx="0.0" cy="132.0" r="8" fill="#C41230" />
          <circle cx="-114.3" cy="66.0" r="8" fill="#C41230" />
          <circle cx="-114.3" cy="-66.0" r="8" fill="#C41230" />
          <circle cx="0.0" cy="-132.0" r="8" fill="#C41230" />
          <circle cx="246.3" cy="0.0" r="8" fill="#C41230" />
          <circle cx="123.2" cy="213.3" r="8" fill="#C41230" />
          <circle cx="-123.2" cy="213.3" r="8" fill="#C41230" />
          <circle cx="-246.3" cy="0.0" r="8" fill="#C41230" />
          <circle cx="-123.2" cy="-213.3" r="8" fill="#C41230" />
          <circle cx="123.2" cy="-213.3" r="8" fill="#C41230" />
        </svg>

        {/* The words */}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 70 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#C41230', fontSize: 130, fontWeight: 700, letterSpacing: '-0.02em' }}>IR</span>
          </div>
          <div style={{ width: 80, height: 6, background: '#C41230', marginTop: 18, marginBottom: 26, display: 'flex' }} />
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 34, letterSpacing: '0.22em' }}>THE GEOMETRY</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 34, letterSpacing: '0.22em', marginTop: 8 }}>OF WINNING.</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 19, letterSpacing: '0.14em', marginTop: 42 }}>
            FEDERAL CONTRACT INTELLIGENCE · IR-GOV.APP
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
