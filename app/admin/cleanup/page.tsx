"use client"

import { useState } from 'react'

export default function Cleanup() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [progress, setProgress] = useState({ total: 0, done: 0 })

  const append = (m: string) => setLog((prev) => [...prev, m])

  const purgeAll = async () => {
    setRunning(true)
    setLog([])
    try {
      // 1) Purge legacy storage (used by /admin page)
      const resLegacy = await fetch('/api/fonts?includeUnpublished=true', { cache: 'no-store' })
      const legacy = await resLegacy.json()
      const files: string[] = (legacy.fonts || []).map((f: any) => f.filename)
      append(`Legacy fonts: ${files.length}`)
      for (let i = 0; i < files.length; i++) {
        const filename = files[i]
        try {
          await fetch(`/api/fonts/delete?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
          if ((i + 1) % 10 === 0) append(`Legacy deleted ${i + 1}/${files.length}`)
        } catch (e: any) {
          append(`Legacy delete error ${filename}: ${e?.message || 'unknown'}`)
        }
      }

      // 2) Purge clean storage (used by catalog)
      const resClean = await fetch('/api/fonts-clean/list', { cache: 'no-store' })
      const data = await resClean.json()
      const ids: string[] = (data.fonts || []).map((f: any) => f.id)
      append(`Clean fonts: ${ids.length}`)
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        try {
          await fetch('/api/fonts-clean/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
          if ((i + 1) % 10 === 0) append(`Clean deleted ${i + 1}/${ids.length}`)
        } catch (e: any) {
          append(`Clean delete error ${id}: ${e?.message || 'unknown'}`)
        }
      }
      append('Done. Refresh Library/Admin to verify it is empty.')
    } catch (e: any) {
      append(`Error: ${e?.message || 'unknown'}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Dataset Cleanup</h1>
      <p className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>
        Remove all font records from storage so you can start fresh.
      </p>
      <button disabled={running} onClick={purgeAll} className="btn-md">
        {running ? `Deleting… ${progress.done}/${progress.total}` : 'Purge All Fonts'}
      </button>
      <pre className="p-4 rounded" style={{ background: 'var(--gray-surface-sec)', whiteSpace: 'pre-wrap', minHeight: 120 }}>
        {log.join('\n')}
      </pre>
    </main>
  )
}
