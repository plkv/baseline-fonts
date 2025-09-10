"use client"

import { useState } from 'react'

export default function BulkUpload() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files || files.length === 0) return
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('files', f))
      const res = await fetch('/api/fonts-clean/bulk-upload', { method: 'POST', body: fd })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ success: false, error: (e as any)?.message || String(e) })
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Bulk Upload Fonts</h1>
      <p className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>
        Select your .ttf / .otf / .woff2 files and upload. We’ll store them in Blob, parse metadata, and update the catalog.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="block"
        />
        <button disabled={uploading || !files?.length} className="btn-md">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      {result && (
        <pre
          className="p-4 rounded"
          style={{ background: 'var(--gray-surface-sec)', whiteSpace: 'pre-wrap' }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      <div className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>
        Tip: After upload, refresh the library to see live previews.
      </div>
    </main>
  )
}

