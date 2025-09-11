import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

type Coll = 'Text'|'Display'|'Weirdo'
const keyOf = (type: 'appearance'|'category', collection: Coll) => `tags:vocab:${type}:${collection}`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') as 'appearance'|'category') || 'appearance'
    const collection = (searchParams.get('collection') as Coll) || 'Text'

    const all = await fontStorageClean.getAllFonts()
    // Group all variants by family, then resolve a single family collection (majority) to match catalog behavior
    const familiesByName = new Map<string, any[]>()
    for (const f of all as any[]) {
      const fam = f.family || f.name
      if (!familiesByName.has(fam)) familiesByName.set(fam, [])
      familiesByName.get(fam)!.push(f)
    }
    const counts = new Map<string, number>()
    familiesByName.forEach((fonts, famName) => {
      // Resolve collection by majority across family variants
      const collCounts: Record<Coll, number> = { Text: 0, Display: 0, Weirdo: 0 }
      fonts.forEach((f: any)=>{ const c: Coll = (f.collection as Coll) || 'Text'; collCounts[c]++ })
      const resolved: Coll = (['Text','Display','Weirdo'] as Coll[]).reduce((best, curr) => (collCounts[curr] > collCounts[best] ? curr : best), 'Text')
      if (resolved !== collection) return
      const tagSet = new Set<string>()
      fonts.forEach((f: any) => {
        if (type === 'category') {
          const cats: string[] = Array.isArray(f.category) ? f.category : (typeof f.category === 'string' ? [f.category] : [])
          cats.forEach((t: string) => tagSet.add(toTitleCase(t)))
        } else {
          const src = (f.styleTags || f.tags)
          const tags: string[] = Array.isArray(src) ? src : (typeof src === 'string' ? [src] : [])
          tags.forEach((t: string) => tagSet.add(toTitleCase(t)))
        }
      })
      tagSet.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1))
    })

    // Vocabulary from KV (ordered)
    const vocab: string[] = (await kv.get<string[]>(keyOf(type, collection))) || []
    const usage = Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }))
      .sort((a,b)=> a.tag.localeCompare(b.tag))
    const missing = usage.filter(u => !vocab.map(v=>v.toLowerCase()).includes(u.tag.toLowerCase())).map(u=>u.tag)
    return NextResponse.json({ success: true, type, collection, vocab, usage, missing })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
