'use client'

import { useState } from 'react'
import type { Contract } from '@/lib/sam-api'

export function SaveContractButton({ contract }: { contract: Contract }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/contracts/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          samNoticeId: contract.noticeId,
          title: contract.title,
          agency: contract.agency,
          value: contract.value,
          deadline: contract.responseDeadline,
          matchScore: contract.matchScore,
        }),
      })
      if (res.ok) {
        setSaved(true)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Save failed: ${data.error ?? `server error ${res.status}`}. Try again in a moment.`)
      }
    } catch (err) {
      console.error(err)
      alert('Save failed: network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px', fontSize: 10, letterSpacing: '0.1em', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)', color: '#16a34a', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        ♥ SAVED TO WATCHLIST
      </div>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#C41230', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
    >
      {loading ? 'SAVING…' : '♡ SAVE CONTRACT →'}
    </button>
  )
}
