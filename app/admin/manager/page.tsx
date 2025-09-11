"use client"

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

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
  category: string[]
}

export default function AdminManager() {
  const [loading, setLoading] = useState(false)
  const [fonts, setFonts] = useState<CleanFont[]>([])
  const [query, setQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'Text' | 'Display' | 'Weirdo'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Record<string, { collection: Family['collection']; styleTags: string[]; languages: string[]; category?: string[] }>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadFamily, setUploadFamily] = useState('')
  const [uploadCollection, setUploadCollection] = useState<'Text'|'Display'|'Weirdo'>('Text')
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [manageType, setManageType] = useState<'appearance'|'category'>('appearance')
  const [manageCollection, setManageCollection] = useState<'Text'|'Display'|'Weirdo'>('Text')
  const [tagEdits, setTagEdits] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})

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

  // Load vocabularies from KV and merge in used tags from catalog (legacy+clean)
  useEffect(()=>{
    const refreshVocab = async () => {
      try {
        const loadOne = async (type: 'appearance'|'category', collection: 'Text'|'Display'|'Weirdo') => {
          const res = await fetch(`/api/tags/vocab?type=${type}&collection=${collection}`, { cache:'no-store' })
          const data = await res.json()
          return Array.isArray(data.list) ? data.list : []
        }
        const loadUsage = async (type: 'appearance'|'category') => {
          const res = await fetch(`/api/tags/usage?type=${type}`, { cache:'no-store' })
          const data = await res.json()
          return (data.usage || { Text: [], Display: [], Weirdo: [] }) as { Text: string[]; Display: string[]; Weirdo: string[] }
        }
        const [appText, appDisp, appWeir] = await Promise.all([
          loadOne('appearance','Text'), loadOne('appearance','Display'), loadOne('appearance','Weirdo')
        ])
        const [catText, catDisp, catWeir] = await Promise.all([
          loadOne('category','Text'), loadOne('category','Display'), loadOne('category','Weirdo')
        ])
        const usageApp = await loadUsage('appearance')
        const usageCat = await loadUsage('category')
        const merge = (curr: string[], used: string[]) => Array.from(new Set([...(curr||[]), ...(used||[])])).sort((a,b)=>a.localeCompare(b))
        const appMerged = { Text: merge(appText, usageApp.Text), Display: merge(appDisp, usageApp.Display), Weirdo: merge(appWeir, usageApp.Weirdo) }
        const catMerged = { Text: merge(catText, usageCat.Text), Display: merge(catDisp, usageCat.Display), Weirdo: merge(catWeir, usageCat.Weirdo) }
        setAppearanceVocab(appMerged)
        setCategoryVocab(catMerged)
        // Persist merges back to KV silently
        const persist = async (type: 'appearance'|'category', coll: 'Text'|'Display'|'Weirdo', list: string[]) => {
          await fetch('/api/tags/vocab', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type, collection: coll, list }) })
        }
        await Promise.all([
          persist('appearance','Text', appMerged.Text), persist('appearance','Display', appMerged.Display), persist('appearance','Weirdo', appMerged.Weirdo),
          persist('category','Text', catMerged.Text), persist('category','Display', catMerged.Display), persist('category','Weirdo', catMerged.Weirdo),
        ])
      } catch (e) {
        // no-op
      }
    }
    refreshVocab()
  }, [])

  // On modal open or scope change, fetch authoritative summary: vocab (ordered) + usage counts + missing
  useEffect(()=>{
    if (!manageTagsOpen) return
    (async ()=>{
      try {
        const res = await fetch(`/api/tags/summary?type=${manageType}&collection=${manageCollection}`, { cache: 'no-store' })
        const data = await res.json()
        const vocab: string[] = Array.isArray(data.vocab) ? data.vocab : []
        // build usage map
        const usageArr: Array<{ tag: string; count: number }> = Array.isArray(data.usage) ? data.usage : []
        const map: Record<string, number> = {}
        usageArr.forEach(u => { map[u.tag] = u.count })
        setUsageCounts(map)
        setTagEdits(vocab)
      } catch {}
    })()
  }, [manageTagsOpen, manageType, manageCollection])

  // Vocabularies persisted in KV; fallback to dataset on first load
  const [appearanceVocab, setAppearanceVocab] = useState<Record<'Text'|'Display'|'Weirdo', string[]>>({ Text: [], Display: [], Weirdo: [] })
  const [categoryVocab, setCategoryVocab] = useState<Record<'Text'|'Display'|'Weirdo', string[]>>({ Text: [], Display: [], Weirdo: [] })

  useEffect(()=>{
    const fetchVocab = async () => {
      const loadOne = async (type: 'appearance'|'category', collection: 'Text'|'Display'|'Weirdo') => {
        const res = await fetch(`/api/tags/vocab?type=${type}&collection=${collection}`, { cache:'no-store' })
        const data = await res.json()
        return Array.isArray(data.list) ? data.list : []
      }
      const defaultsAppearance = { Text: new Set<string>(), Display: new Set<string>(), Weirdo: new Set<string>() } as any
      fonts.forEach(f=>{ const c = (f.collection as any)||'Text'; (f.styleTags||[]).forEach((t)=> defaultsAppearance[c].add(t)) })
      const defaultsCategory = { Text: new Set<string>(), Display: new Set<string>(), Weirdo: new Set<string>() } as any
      fonts.forEach(f=>{ const c = (f.collection as any)||'Text'; (f.category||[]).forEach((t)=> defaultsCategory[c].add(t)) })

      const appText = await loadOne('appearance','Text'); const appDisp = await loadOne('appearance','Display'); const appWeir = await loadOne('appearance','Weirdo')
      const catText = await loadOne('category','Text'); const catDisp = await loadOne('category','Display'); const catWeir = await loadOne('category','Weirdo')
      setAppearanceVocab({
        Text: (appText.length? appText : Array.from(defaultsAppearance.Text)).sort((a,b)=>a.localeCompare(b)),
        Display: (appDisp.length? appDisp : Array.from(defaultsAppearance.Display)).sort((a,b)=>a.localeCompare(b)),
        Weirdo: (appWeir.length? appWeir : Array.from(defaultsAppearance.Weirdo)).sort((a,b)=>a.localeCompare(b)),
      })
      setCategoryVocab({
        Text: (catText.length? catText : Array.from(defaultsCategory.Text)).sort((a,b)=>a.localeCompare(b)),
        Display: (catDisp.length? catDisp : Array.from(defaultsCategory.Display)).sort((a,b)=>a.localeCompare(b)),
        Weirdo: (catWeir.length? catWeir : Array.from(defaultsCategory.Weirdo)).sort((a,b)=>a.localeCompare(b)),
      })
    }
    fetchVocab()
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
      const category = (representative.category as any) || []
      return { name, fonts: list, stylesCount, uploadedAt, collection, styleTags, languages, category }
    })
    // basic filter/sort
    const filtered = arr.filter(f => (collectionFilter === 'all' ? true : f.collection === collectionFilter))
      .filter(f => (query ? f.name.toLowerCase().includes(query.toLowerCase()) : true))
    if (sortBy === 'alpha') filtered.sort((a, b) => a.name.localeCompare(b.name))
    else filtered.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    return filtered
  }, [fonts, collectionFilter, sortBy, query])

  // Build language vocabulary from data
  const languageVocabulary = useMemo<string[]>(() => {
    const langs = new Set<string>()
    for (const f of fonts) (f.languages || []).forEach(l => langs.add(l))
    if (!langs.size) return ['Latin']
    return Array.from(langs).sort((a, b) => a.localeCompare(b))
  }, [fonts])

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
    await Promise.all(fam.fonts.map(async f => {
      const res = await fetch('/api/fonts-clean/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, updates }) })
      if (!res.ok) {
        // ignore legacy-only variants for now
      }
    }))
    setEditing(prev => { const c = { ...prev }; delete c[fam.name]; return c })
    // Optimistic local update to avoid full reload
    setFonts(prev => prev.map(f => f.family === fam.name ? { ...f, collection: e.collection, styleTags: e.styleTags, languages: e.languages } : f))
    try { toast.success('Family updated') } catch {}
  }

  const deleteFamily = async (fam: Family) => {
    if (!confirm(`Delete family ${fam.name} and all ${fam.fonts.length} styles?`)) return
    await Promise.all(fam.fonts.map(async f => {
      const resp = await fetch('/api/fonts-clean/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id }) })
      if (!resp.ok) {
        // fallback to legacy delete by filename
        try { await fetch(`/api/fonts/delete?filename=${encodeURIComponent(f.filename)}`, { method: 'DELETE' }) } catch {}
      }
    }))
    setFonts(prev => prev.filter(f => f.family !== fam.name))
    try { toast.success('Family deleted') } catch {}
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files', f))
      if (uploadFamily.trim()) fd.append('family', uploadFamily.trim())
      fd.append('collection', uploadCollection)
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
      fd.append('collection', uploadCollection)
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
      <Toaster richColors position="top-right" />
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
          <Dialog open={manageTagsOpen} onOpenChange={(o)=>{ setManageTagsOpen(o); if(!o) setTagEdits([]) }}>
            <DialogTrigger className="btn-md">Manage Tags</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-2">
                <select className="btn-md" value={manageType} onChange={e=>{ setManageType(e.target.value as any); setTagEdits([]) }}>
                  <option value="appearance">Appearance</option>
                  <option value="category">Category</option>
                </select>
                <select className="btn-md" value={manageCollection} onChange={e=>{ setManageCollection(e.target.value as any); setTagEdits([]) }}>
                  <option>Text</option>
                  <option>Display</option>
                  <option>Weirdo</option>
                </select>
              </div>
              <div className="space-y-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                {(tagEdits.length ? tagEdits : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])).map((t, idx) => {
                  const usedBy = usageCounts[t] || 0
                  return (
                    <div key={idx} className="flex gap-2 items-center" draggable onDragStart={()=>{ setDragIdx(idx); if (!tagEdits.length) setTagEdits(manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection]) }} onDragOver={(e)=>e.preventDefault()} onDrop={()=>{
                      if (dragIdx===null) return; const list = (tagEdits.length? [...tagEdits] : [...(manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])]);
                      const [m] = list.splice(dragIdx,1); list.splice(idx,0,m); setTagEdits(list); setDragIdx(null)
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--gray-cont-tert)', cursor: 'grab' }}>drag_indicator</span>
                      <input className="btn-md flex-1" value={(tagEdits.length? tagEdits : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection]))[idx] || ''} onChange={(e)=>{
                        setTagEdits(prev=>{ const base = prev.length? [...prev] : [...(manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])]; base[idx] = normalizeTag(e.target.value); return base })
                      }} />
                      <span className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>{usedBy}</span>
                      <button className="btn-sm" onClick={()=>setTagEdits(prev=>{ const base = prev.length? [...prev] : [...(manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])]; base.splice(idx,1); return base })}>Remove</button>
                    </div>
                  )
                })}
                <button className="btn-sm" onClick={()=>setTagEdits(prev=>[...(prev.length? prev : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])), 'New Tag'])}>+ Add Tag</button>
                {/* Missing used tags not in vocab: quick add list */}
                <div className="mt-2">
                  <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Used but not in list</div>
                  <MissingUsed type={manageType} collection={manageCollection} current={(tagEdits.length? tagEdits : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection]))} onAdd={(t)=>setTagEdits(prev=>[...(prev.length? prev : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection])), normalizeTag(t)])} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose className="btn-md">Cancel</DialogClose>
                <button className="btn-md" onClick={async()=>{
                  // Build new ordered, normalized, de-duplicated list
                  const base = (tagEdits.length? tagEdits : (manageType==='appearance'? appearanceVocab[manageCollection] : categoryVocab[manageCollection]))
                  const seen = new Set<string>()
                  const newList: string[] = []
                  base.forEach((t)=>{ const n = normalizeTag(t); const key = n.toLowerCase(); if (n && !seen.has(key)) { seen.add(key); newList.push(n) } })
                  const keep = new Set(newList.map(x=>x.toLowerCase()))
                  // Apply pruning across families (no auto-rename to avoid duplicates)
                  const updates: Array<Promise<any>> = []
                  families.filter(f=>f.collection===manageCollection).forEach(f=>{
                    if (manageType==='appearance') {
                      const curr = (f.styleTags||[])
                      const pruned = curr.filter(t=> keep.has((t||'').toLowerCase()))
                      if (JSON.stringify(pruned.slice().sort()) !== JSON.stringify(curr.slice().sort())) {
                        f.fonts.forEach(font=>{
                          updates.push(fetch('/api/fonts-clean/update', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: font.id, updates: { styleTags: pruned } }) }))
                        })
                      }
                    } else {
                      const curr = ((f as any).category||[])
                      const pruned = curr.filter((t:string)=> keep.has((t||'').toLowerCase()))
                      if (JSON.stringify(pruned.slice().sort()) !== JSON.stringify(curr.slice().sort())) {
                        f.fonts.forEach(font=>{
                          updates.push(fetch('/api/fonts-clean/update', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: font.id, updates: { category: pruned } }) }))
                        })
                      }
                    }
                  })
                  // Persist vocabulary order to KV
                  await fetch('/api/tags/vocab', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ type: manageType, collection: manageCollection, list: newList }) })
                  await Promise.all(updates)
                  setTagEdits(newList)
                  try { toast.success('Tags saved') } catch {}
                  await load()
                  // refresh vocab
                  const res = await fetch(`/api/tags/vocab?type=${manageType}&collection=${manageCollection}`, { cache:'no-store' })
                  const data = await res.json()
                  const list = Array.isArray(data.list) ? data.list : []
                  if (manageType==='appearance') setAppearanceVocab(prev=>({ ...prev, [manageCollection]: list }))
                  else setCategoryVocab(prev=>({ ...prev, [manageCollection]: list }))
                }}>Save</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            <select className="btn-md" value={uploadCollection} onChange={e=> setUploadCollection(e.target.value as any)}>
              <option>Text</option>
              <option>Display</option>
              <option>Weirdo</option>
            </select>
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
          const alias = `${canonicalFamilyName(fam.name)}-${shortHash(canonicalFamilyName(fam.name)).slice(0,6)}`
          const isOpen = expanded.has(fam.name)
          const ed = editing[fam.name]
          return (
            <div key={fam.name} className="p-3 rounded-md" style={{ border: '1px solid var(--gray-brd-prim)' }}>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleExpand(fam.name)} className="menu-tab">
                  <span style={{ fontFamily: `"${alias}", system-ui, sans-serif`, fontWeight: 600 }}>{fam.name}</span>
                  <span style={{ color: 'var(--gray-cont-tert)', marginLeft: 8 }}>• {fam.stylesCount} styles • {new Date(fam.uploadedAt || Date.now()).toLocaleDateString()}</span>
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
                  {/* Collection row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Collection</div>
                    {(['Text','Display','Weirdo'] as const).map(c => (
                      <button key={c} className={`btn-sm ${ (editing[fam.name]?.collection ?? fam.collection) === c ? 'active' : '' }`} onClick={()=>{
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), collection: c }}))
                      }}>{c}</button>
                    ))}
                  </div>

                  {/* Languages row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Languages</div>
                    {languageVocabulary.map(l => (
                      <button key={l} className={`btn-sm ${ (editing[fam.name]?.languages ?? fam.languages).includes(l) ? 'active' : '' }`} onClick={()=>{
                        const base = editing[fam.name]?.languages ?? fam.languages
                        const next = base.includes(l) ? base.filter(x=>x!==l) : [...base, l]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), languages: next }}))
                      }}>{l}</button>
                    ))}
                  </div>

                  {/* Category row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Category</div>
                    {categoryVocab[(editing[fam.name]?.collection ?? fam.collection)]?.map(t => (
                      <button key={t} className={`btn-sm ${ ((editing[fam.name] as any)?.category ?? (fam as any).category ?? []).map((x:string)=>x.toLowerCase()).includes(t.toLowerCase()) ? 'active' : '' }`} onClick={()=>{
                        const base = (((editing[fam.name] as any)?.category ?? (fam as any).category) || []) as string[]
                        const has = base.map(x=>x.toLowerCase()).includes(t.toLowerCase())
                        const next = has ? base.filter(x=>x.toLowerCase()!==t.toLowerCase()) : [...base, t]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), category: next }}))
                      }}>{t}</button>
                    ))}
                  </div>

                  {/* Appearance row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Appearance</div>
                    {appearanceVocab[(editing[fam.name]?.collection ?? fam.collection)]?.map(t => (
                      <button key={t} className={`btn-sm ${ (editing[fam.name]?.styleTags ?? fam.styleTags).map(x=>x.toLowerCase()).includes(t.toLowerCase()) ? 'active' : '' }`} onClick={()=>{
                        const base = editing[fam.name]?.styleTags ?? fam.styleTags
                        const normalized = normalizeTag(t)
                        const has = base.map(x=>x.toLowerCase()).includes(normalized.toLowerCase())
                        const next = has ? base.filter(x=>x.toLowerCase()!==normalized.toLowerCase()) : [...base, normalized]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), styleTags: next }}))
                      }}>{t}</button>
                    ))}
                  </div>
                  {ed && (
                    <div className="flex gap-2">
                      <button className="btn-md" onClick={() => {
                        // If category edited, persist alongside other fields
                        const edState = editing[fam.name]
                        if (edState?.category) {
                          fam.fonts.forEach(font=>{
                            fetch('/api/fonts-clean/update', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: font.id, updates: { category: edState.category } }) })
                          })
                        }
                        saveEdit(fam)
                      }}>Save</button>
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

function MissingUsed({ type, collection, current, onAdd }: { type: 'appearance'|'category', collection: 'Text'|'Display'|'Weirdo', current: string[], onAdd: (t:string)=>void }) {
  const [missing, setMissing] = useState<string[]>([])
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch(`/api/tags/summary?type=${type}&collection=${collection}`, { cache:'no-store' })
        const data = await res.json()
        const currL = (current||[]).map(x=>x.toLowerCase())
        const miss = (Array.isArray(data.missing)? data.missing:[]).filter((t:string)=>!currL.includes(t.toLowerCase()))
        setMissing(miss)
      } catch { setMissing([]) }
    })()
  }, [type, collection, JSON.stringify(current)])
  if (!missing.length) return null
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {missing.map((t)=>(<button key={t} className="btn-sm" onClick={()=>onAdd(t)}>+ {t}</button>))}
    </div>
  )
}
