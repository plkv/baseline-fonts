import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

type Coll = 'Text'|'Display'|'Weirdo'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { type: 'appearance'|'category', collection: Coll, list: string[] }
    const { type, collection, list } = body
    if (!type || !collection || !Array.isArray(list)) {
      return NextResponse.json({ success: false, error: 'type, collection, list required' }, { status: 400 })
    }
    const keep = new Set(list.map(s=>toTitleCase(s).toLowerCase()))
    const all = await fontStorageClean.getAllFonts()
    let updated = 0
    for (const f of all as any[]) {
      const coll: Coll = (f.collection as Coll) || 'Text'
      if (coll !== collection) continue
      if (type === 'appearance') {
        const curr: string[] = Array.isArray(f.styleTags) ? f.styleTags : (typeof f.styleTags === 'string' ? [f.styleTags] : [])
        const pruned = curr.filter(t=> keep.has((t||'').toLowerCase()))
        if (JSON.stringify(pruned.slice().sort()) !== JSON.stringify(curr.slice().sort())) {
          await fontStorageClean.updateFont(f.id, { styleTags: pruned } as any)
          updated++
        }
      } else {
        const curr: string[] = Array.isArray(f.category) ? f.category : (typeof f.category === 'string' ? [f.category] : [])
        const pruned = curr.filter(t=> keep.has((t||'').toLowerCase()))
        if (JSON.stringify(pruned.slice().sort()) !== JSON.stringify(curr.slice().sort())) {
          await fontStorageClean.updateFont(f.id, { category: pruned } as any)
          updated++
        }
      }
    }
    return NextResponse.json({ success: true, updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

