'use client'

import { useState } from 'react'

const mono = 'var(--font-geist-mono, monospace)'
const crimson = '#C41230'

// One-tap copy. The whole point of the studio is that a post goes from data to
// clipboard without retyping, and this runs on a phone as often as a desk.
export default function CopyBlock({ text, label, small }: { text: string; label: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => { /* clipboard blocked — the text is on screen to select */ })
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: small ? '6px 12px' : '9px 16px',
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        fontFamily: mono,
        cursor: 'pointer',
        background: copied ? 'rgba(74,222,128,0.12)' : crimson,
        color: copied ? '#4ADE80' : '#fff',
        border: copied ? '1px solid rgba(74,222,128,0.35)' : 'none',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'COPIED ✓' : label}
    </button>
  )
}
