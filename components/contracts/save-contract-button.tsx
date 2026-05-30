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
      if (res.ok) setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 cursor-default">
        ♥ Saved
      </div>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-slate-950 transition-colors disabled:opacity-60"
      style={{ background: '#C8A96E' }}
    >
      {loading ? 'Saving…' : '♡ Save Contract'}
    </button>
  )
}
