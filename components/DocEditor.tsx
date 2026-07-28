'use client'

import { useRef, useEffect, useState } from 'react'

const mono = 'var(--font-geist-mono, monospace)'

// A lightweight Google-Docs-style rich text editor. contentEditable page +
// a formatting toolbar. Emits HTML on every edit; the parent owns save/export.
// (Uses document.execCommand — deprecated but universally supported, and the
// pragmatic choice for a v1 without a heavy editor dependency.)
type Cmd = { label: string; title: string; run: () => void; active?: () => boolean }

export default function DocEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string
  onChange: (html: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [, force] = useState(0)

  // Load initial content once (not controlled — contentEditable manages its
  // own DOM; re-writing innerHTML on every render would move the caret)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) {
      ref.current.innerHTML = initialHtml
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => { if (ref.current) onChange(ref.current.innerHTML) }
  const exec = (command: string, value?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, value)
    emit()
    force(n => n + 1) // refresh active states
  }
  const block = (tag: string) => exec('formatBlock', tag)
  const isBlock = (tag: string) => {
    try { return document.queryCommandValue('formatBlock').toLowerCase() === tag.toLowerCase() } catch { return false }
  }
  const isOn = (cmd: string) => { try { return document.queryCommandState(cmd) } catch { return false } }

  const groups: Cmd[][] = [
    [
      { label: 'H1', title: 'Heading 1', run: () => block('h1'), active: () => isBlock('h1') },
      { label: 'H2', title: 'Heading 2', run: () => block('h2'), active: () => isBlock('h2') },
      { label: 'H3', title: 'Heading 3', run: () => block('h3'), active: () => isBlock('h3') },
      { label: '¶', title: 'Body text', run: () => block('p'), active: () => isBlock('p') || isBlock('div') },
    ],
    [
      { label: 'B', title: 'Bold', run: () => exec('bold'), active: () => isOn('bold') },
      { label: 'I', title: 'Italic', run: () => exec('italic'), active: () => isOn('italic') },
      { label: 'U', title: 'Underline', run: () => exec('underline'), active: () => isOn('underline') },
    ],
    [
      { label: '• List', title: 'Bulleted list', run: () => exec('insertUnorderedList'), active: () => isOn('insertUnorderedList') },
      { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList'), active: () => isOn('insertOrderedList') },
    ],
    [
      { label: '⯇', title: 'Align left', run: () => exec('justifyLeft') },
      { label: '≡', title: 'Align center', run: () => exec('justifyCenter') },
      { label: '⯈', title: 'Align right', run: () => exec('justifyRight') },
    ],
    [
      { label: '─ Rule', title: 'Insert horizontal rule', run: () => exec('insertHorizontalRule') },
    ],
  ]

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', background: '#f1f0ec', borderRadius: 4, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 10px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 2 }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ display: 'flex', gap: 2, paddingRight: 6, marginRight: 2, borderRight: gi < groups.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
            {g.map(c => {
              const on = c.active?.() ?? false
              return (
                <button
                  key={c.label}
                  type="button"
                  title={c.title}
                  onMouseDown={e => { e.preventDefault(); c.run() }}
                  style={{
                    minWidth: 26, padding: '5px 8px', fontSize: 11, cursor: 'pointer', fontFamily: mono,
                    fontWeight: c.label === 'B' ? 700 : 600,
                    fontStyle: c.label === 'I' ? 'italic' : 'normal',
                    textDecoration: c.label === 'U' ? 'underline' : 'none',
                    background: on ? '#0A0A0A' : 'transparent',
                    color: on ? '#fff' : 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 3,
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* The page */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onKeyUp={() => force(n => n + 1)}
          onMouseUp={() => force(n => n + 1)}
          className="ir-doc-page"
          style={{
            width: '100%', maxWidth: 660, minHeight: 400, background: '#fff',
            boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: '56px 64px',
            outline: 'none', color: '#16181c',
            fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14, lineHeight: 1.6,
          }}
        />
      </div>

      <style>{`
        .ir-doc-page h1 { font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.01em; }
        .ir-doc-page h2 { font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 22px 0 8px; color: #0A0A0A; }
        .ir-doc-page h3 { font-family: Arial, sans-serif; font-size: 12.5px; font-weight: 700; margin: 16px 0 6px; }
        .ir-doc-page p { margin: 0 0 11px; }
        .ir-doc-page ul, .ir-doc-page ol { margin: 0 0 12px; padding-left: 22px; }
        .ir-doc-page li { margin-bottom: 4px; }
        .ir-doc-page hr { border: none; border-top: 1px solid rgba(0,0,0,0.25); margin: 16px 0; }
        .ir-doc-page:empty:before { content: 'Start typing…'; color: rgba(0,0,0,0.3); }
      `}</style>
    </div>
  )
}
