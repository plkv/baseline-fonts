"use client"

import { useEffect, useMemo, useState } from 'react'

type CleanFont = {
  id: string
  family: string
  filename: string
  weight?: number
  style?: string
  isVariable?: boolean
  variableAxes?: Array<{ name: string; axis: string; min: number; max: number; default: number }>
  openTypeFeatures?: string[]
  foundry?: string
  version?: string
  license?: string
  uploadedAt?: string
  collection?: 'Text' | 'Display' | 'Weirdo'
  styleTags?: string[]
  languages?: string[]
  category?: string[]
}

type Family = {
  name: string
  fonts: CleanFont[]
  stylesCount: number
  uploadedAt: string
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  languages: string[]
}

export default function AdminManager() {
  const [loading, setLoading] = useState(false)
  const [fonts, setFonts] = useState<CleanFont[]>([])
  const [query, setQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'Text' | 'Display' | 'Weirdo'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Record<string, { collection: Family['collection']; styleTags: string[]; languages: string[] }>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadFamily, setUploadFamily] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fonts-clean/list', { cache: 'no-store' })
      const data = await res.json()
      setFonts(data.fonts || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Build a vocabulary of existing tags to avoid duplicates
  const tagVocabulary = useMemo<string[]>(() => {
    const tags = new Set<string>()
    for (const f of fonts) {
      (f.styleTags || []).forEach(t => tags.add(t))
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [fonts])

  const normalizeTag = (t: string) => {
    const s = t.trim().replace(/\s+/g, ' ')
    // Title Case simple
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  const families = useMemo<Family[]>(() => {
    const m = new Map<string, CleanFont[]>()
    for (const f of fonts) {
      const k = f.family || 'Unknown'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(f)
    }
    const arr: Family[] = Array.from(m.entries()).map(([name, list]) => {
      const uploadedAt = list.map(f => f.uploadedAt || '').sort().reverse()[0] || ''
      const stylesCount = list.length
      const representative = list[0]
      const collection = (representative.collection as any) || 'Text'
      const styleTags = representative.styleTags || []
      const languages = representative.languages || ['Latin']
      return { name, fonts: list, stylesCount, uploadedAt, collection, styleTags, languages }
    })
    // basic filter/sort
    const filtered = arr.filter(f => (collectionFilter === 'all' ? true : f.collection === collectionFilter))
      .filter(f => (query ? f.name.toLowerCase().includes(query.toLowerCase()) : true))
    if (sortBy === 'alpha') filtered.sort((a, b) => a.name.localeCompare(b.name))
    else filtered.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    return filtered
  }, [fonts, collectionFilter, sortBy, query])

  const toggleExpand = (name: string) => {
    setExpanded(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })
  }

  const startEdit = (fam: Family) => {
    setEditing(prev => ({ ...prev, [fam.name]: { collection: fam.collection, styleTags: [...fam.styleTags], languages: [...fam.languages] } }))
    setExpanded(prev => new Set(prev).add(fam.name))
  }

  const saveEdit = async (fam: Family) => {
    const e = editing[fam.name]
    if (!e) return
    // apply updates to all fonts in family
    const updates = { collection: e.collection, styleTags: e.styleTags, languages: e.languages }
    await Promise.all(fam.fonts.map(f => fetch('/api/fonts-clean/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, updates }) })))
    setEditing(prev => { const c = { ...prev }; delete c[fam.name]; return c })
    await load()
  }

  const deleteFamily = async (fam: Family) => {
    if (!confirm(`Delete family ${fam.name} and all ${fam.fonts.length} styles?`)) return
    await Promise.all(fam.fonts.map(f => fetch('/api/fonts-clean/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id }) })))
    await load()
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files', f))
      if (uploadFamily.trim()) fd.append('family', uploadFamily.trim())
      const res = await fetch('/api/fonts-clean/bulk-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) alert('Upload failed')
      await load()
    } finally {
      setUploading(false)
      e.currentTarget.value = ''
    }
  }

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      if (uploadFamily.trim()) fd.append('family', uploadFamily.trim())
      const res = await fetch('/api/fonts-clean/bulk-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) alert('Upload failed')
      await load()
    } finally {
      setUploading(false)
      setPendingFiles([])
    }
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin — Font Manager</h1>
        <div className="flex gap-2 items-center">
          <input placeholder="Search family" value={query} onChange={e => setQuery(e.target.value)} className="btn-md" />
          <select className="btn-md" value={collectionFilter} onChange={e => setCollectionFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="Text">Text</option>
            <option value="Display">Display</option>
            <option value="Weirdo">Weirdo</option>
          </select>
          <select className="btn-md" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="alpha">A–Z</option>
          </select>
        </div>
      </header>

      {/* Upload zone (prominent, at top) */}
      <section className="p-4 rounded-md space-y-3" style={{ border: '1px dashed var(--gray-brd-prim)', background: 'var(--gray-surface-sec)' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files || []); if (files.length) setPendingFiles(files) }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-font-name">Upload Fonts</h2>
            <div className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>
              Drag & drop font files here or select files. Supports single static, multi-file family, and variable fonts.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input className="btn-md" placeholder="Optional family name" value={uploadFamily} onChange={e => setUploadFamily(e.target.value)} />
            <label className="btn-md cursor-pointer">
              <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" onChange={onUpload} style={{ display: 'none' }} />
              {uploading ? 'Uploading…' : 'Select Files'}
            </label>
          </div>
        </div>
        {pendingFiles.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--gray-cont-prim)' }}>{pendingFiles.length} files ready</div>
            <div className="flex gap-2">
              <button className="btn-md" onClick={() => handleFiles(pendingFiles)} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Now'}</button>
              <button className="btn-md" onClick={() => setPendingFiles([])} disabled={uploading}>Clear</button>
            </div>
          </div>
        )}
        <div className="text-xs" style={{ color: dragOver ? 'var(--gray-cont-prim)' : 'var(--gray-cont-tert)' }}>
          {dragOver ? 'Release to add to queue' : 'Parsed metadata: family, styles (weight/italic), author, version, release date, license, categories, languages, variable axes, OpenType features.'}
        </div>
      </section>

      {/* Families list */}
      <section className="space-y-3">
        {loading && <div>Loading…</div>}
        {!loading && families.map(fam => {
          const isOpen = expanded.has(fam.name)
          const ed = editing[fam.name]
          return (
            <div key={fam.name} className="p-3 rounded-md" style={{ border: '1px solid var(--gray-brd-prim)' }}>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleExpand(fam.name)} className="menu-tab">
                  {fam.name} <span style={{ color: 'var(--gray-cont-tert)', marginLeft: 8 }}>• {fam.stylesCount} styles • {new Date(fam.uploadedAt || Date.now()).toLocaleDateString()}</span>
                </button>
                <div className="flex gap-2">
                  {!ed && <button className="btn-sm" onClick={() => startEdit(fam)}>Edit</button>}
                  <button className="btn-sm" onClick={() => deleteFamily(fam)}>Delete</button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-3">
                  <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Files</div>
                  <div className="text-sm" style={{ color: 'var(--gray-cont-prim)' }}>
                    {fam.fonts.map(f => (
                      <div key={f.id} className="flex justify-between border-b border-[var(--gray-brd-prim)] py-1">
                        <span>{f.filename}</span>
                        <span>{(f.isVariable ? 'Variable' : (f.style || 'Regular'))} • {f.weight || 400}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Metadata</div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="btn-md">Collection: {ed ? (
                      <select className="btn-md" value={ed.collection} onChange={e => setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], collection: e.target.value as any } }))}>
                        <option>Text</option>
                        <option>Display</option>
                        <option>Weirdo</option>
                      </select>
                    ) : fam.collection}</div>
                    <div className="btn-md">Languages: {ed ? (
                      <input className="btn-md" placeholder="Comma-separated" value={ed.languages.join(', ')} onChange={e => setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                    ) : fam.languages.join(', ')}</div>
                    <div className="btn-md" style={{ minWidth: 280 }}>
                      <div>Tags:</div>
                      {ed ? (
                        <div className="mt-1">
                          <div className="flex gap-1 flex-wrap mb-1">
                            {ed.styleTags.map((t, idx) => (
                              <button key={idx} className="btn-sm" onClick={() => setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], styleTags: ed.styleTags.filter(x => x !== t) } }))}>{t} ✕</button>
                            ))}
                          </div>
                          <input className="btn-md w-full" placeholder="Type to add tag…" onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const v = normalizeTag((e.target as HTMLInputElement).value)
                              if (v && !ed.styleTags.map(x => x.toLowerCase()).includes(v.toLowerCase())) {
                                setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], styleTags: [...ed.styleTags, v] } }))
                              }
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }} />
                          {/* Suggestions from vocabulary */}
                          <div className="flex gap-1 flex-wrap mt-1">
                            {tagVocabulary.filter(v => !ed.styleTags.map(x => x.toLowerCase()).includes(v.toLowerCase())).slice(0, 12).map(v => (
                              <button key={v} className="btn-sm" onClick={() => {
                                const t = normalizeTag(v)
                                if (!ed.styleTags.map(x => x.toLowerCase()).includes(t.toLowerCase())) {
                                  setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], styleTags: [...ed.styleTags, t] } }))
                                }
                              }}>{v}</button>
                            ))}
                          </div>
                        </div>
                      ) : (fam.styleTags.length ? fam.styleTags.join(', ') : '—')}
                    </div>
                  </div>
                  {ed && (
                    <div className="flex gap-2">
                      <button className="btn-md" onClick={() => saveEdit(fam)}>Save</button>
                      <button className="btn-md" onClick={() => setEditing(p => { const c = { ...p }; delete c[fam.name]; return c })}>Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Upload zone */}
      <section className="p-4 rounded-md" style={{ border: '1px solid var(--gray-brd-prim)' }}>
        <h2 className="text-font-name mb-2">Upload Fonts</h2>
        <div className="text-sm mb-2" style={{ color: 'var(--gray-cont-tert)' }}>
          Supports single static file, multi-file family, single variable font, or multi-file variable family.
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="btn-md flex-1" placeholder="Optional: Group files under family name" value={uploadFamily} onChange={e => setUploadFamily(e.target.value)} />
          <label className="btn-md cursor-pointer">
            <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" onChange={onUpload} style={{ display: 'none' }} />
            {uploading ? 'Uploading…' : 'Select Files'}
          </label>
        </div>
        <div className="text-xs" style={{ color: 'var(--gray-cont-tert)' }}>
          Files are parsed for family name, styles (weight, italic), author, version, release date, license, categories, language support, variable axes, and OpenType features.
        </div>
      </section>
    </main>
  )
}
