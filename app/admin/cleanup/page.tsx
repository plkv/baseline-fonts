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
      const res = await fetch('/api/fonts-clean/list', { cache: 'no-store' })
      const data = await res.json()
      const ids: string[] = (data.fonts || []).map((f: any) => f.id)
      setProgress({ total: ids.length, done: 0 })
      append(`Found ${ids.length} fonts. Deleting…`)
      let done = 0
      for (const id of ids) {
        try {
          await fetch('/api/fonts-clean/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
          done++
          setProgress({ total: ids.length, done })
          if (done % 10 === 0) append(`Deleted ${done}/${ids.length}`)
        } catch (e: any) {
          append(`Error deleting ${id}: ${e?.message || 'unknown'}`)
        }
      }
      append('Done')
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

