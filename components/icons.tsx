import type { CSSProperties } from 'react'

// Small, self-drawn line icons for the product UI. Monochrome, inherit
// currentColor, and crisp at tiny sizes — a professional replacement for the
// emoji/glyphs (📍 ↳ ↑ ✓) the contract cards used to render in the OS emoji
// font. No external icon dependency.

type IconProps = { size?: number; color?: string; strokeWidth?: number; style?: CSSProperties; title?: string }

function svgProps(size: number, color: string, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }
}

// Location / place of performance
export function PinIcon({ size = 12, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...svgProps(size, color, strokeWidth)} style={style}>
      <path d="M12 21c4-4.4 6-7.6 6-10.5A6 6 0 0 0 6 10.5C6 13.4 8 16.6 12 21z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </svg>
  )
}

// Upward trend — used for the "why this scored" match-reason line
export function TrendUpIcon({ size = 12, color = 'currentColor', strokeWidth = 1.9, style }: IconProps) {
  return (
    <svg {...svgProps(size, color, strokeWidth)} style={style}>
      <path d="M4 15l5-5 3.5 3.5L20 6" />
      <path d="M15 6h5v5" />
    </svg>
  )
}

// Corner branch — used to mark a sub-agency beneath its parent
export function SubAgencyIcon({ size = 12, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...svgProps(size, color, strokeWidth)} style={style}>
      <path d="M8 5v7a2 2 0 0 0 2 2h8" />
      <path d="M15 11l3.5 3-3.5 3" />
    </svg>
  )
}

// Refresh / re-fetch
export function RefreshIcon({ size = 12, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...svgProps(size, color, strokeWidth)} style={style}>
      <path d="M20 11a8 8 0 0 0-14-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  )
}
