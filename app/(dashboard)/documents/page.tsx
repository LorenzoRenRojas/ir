'use client'

import { useEffect, useState } from 'react'
import { DOCUMENT_TEMPLATES } from '@/lib/documents'

interface GeneratedDoc {
  id: string
  type: string
  title: string
  createdAt: string
}

interface ModalState {
  open: boolean
  type: string
  typeName: string
  contractTitle: string
  agency: string
}

const initialModal: ModalState = {
  open: false,
  type: '',
  typeName: '',
  contractTitle: '',
  agency: '',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(initialModal)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    try {
      const res = await fetch('/api/documents/generate')
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(type: string, typeName: string) {
    setModal({ open: true, type, typeName, contractTitle: '', agency: '' })
    setGeneratedContent(null)
    setError('')
  }

  function closeModal() {
    setModal(initialModal)
    setGeneratedContent(null)
    setError('')
    loadDocs()
  }

  async function handleGenerate() {
    if (!modal.type) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modal.type,
          contractTitle: modal.contractTitle || undefined,
          agency: modal.agency || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed')
        return
      }
      setGeneratedContent(data.content)
    } catch {
      setError('Failed to generate document')
    } finally {
      setGenerating(false)
    }
  }

  function handleDownload() {
    if (!generatedContent) return
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${modal.typeName.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Document Generator</h1>
        <p className="text-slate-400">Generate professional proposal documents filled with your company data</p>
      </div>

      {/* Templates */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {DOCUMENT_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="text-3xl">{tmpl.icon}</div>
            <div>
              <h3 className="text-base font-semibold text-white">{tmpl.name}</h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{tmpl.description}</p>
            </div>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={{
                  background: 'rgba(200,169,110,0.1)',
                  color: '#C8A96E',
                  border: '1px solid rgba(200,169,110,0.25)',
                }}
              >
                {tmpl.requiredTier}+
              </span>
              <button
                onClick={() => openModal(tmpl.type, tmpl.name)}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg text-slate-950 transition-colors"
                style={{ background: '#C8A96E' }}
              >
                Generate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent documents */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Previously Generated</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">No documents generated yet. Use the templates above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(doc.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-xs text-slate-500 capitalize">{doc.type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Generate {modal.typeName}</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {!generatedContent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Contract Title <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={modal.contractTitle}
                      onChange={(e) => setModal((m) => ({ ...m, contractTitle: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                      placeholder="Enterprise IT Modernization Services"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Agency Name <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={modal.agency}
                      onChange={(e) => setModal((m) => ({ ...m, agency: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                      placeholder="Department of Veterans Affairs"
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-400">Document generated successfully</p>
                    <button
                      onClick={handleDownload}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-950"
                      style={{ background: '#C8A96E' }}
                    >
                      ↓ Download
                    </button>
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap overflow-auto max-h-96 font-mono leading-relaxed">
                    {generatedContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
              >
                {generatedContent ? 'Close' : 'Cancel'}
              </button>
              {!generatedContent && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-950 disabled:opacity-60"
                  style={{ background: '#C8A96E' }}
                >
                  {generating ? 'Generating…' : 'Generate Document'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
