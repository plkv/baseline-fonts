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
                    <div className="btn-md">Tags: {ed ? (
                      <input className="btn-md" placeholder="Comma-separated" value={ed.styleTags.join(', ')} onChange={e => setEditing(p => ({ ...p, [fam.name]: { ...p![fam.name], styleTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                    ) : (fam.styleTags.length ? fam.styleTags.join(', ') : '—')}</div>
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

