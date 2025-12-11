import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

// Unified vocabulary - no longer filtered by collection
const keyOf = (type: 'appearance'|'category') => `tags:vocab:${type}`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') as 'appearance'|'category') || 'appearance'

    const all = await fontStorageClean.getAllFonts()
    // Group all variants by family to count usage per family (not per variant)
    const familiesByName = new Map<string, any[]>()
    for (const f of all as any[]) {
      const fam = f.family || f.name
      if (!familiesByName.has(fam)) familiesByName.set(fam, [])
      familiesByName.get(fam)!.push(f)
    }

    const counts = new Map<string, number>()
    // Count tags across ALL families, regardless of collection
    familiesByName.forEach((fonts, famName) => {
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

    // Vocabulary from unified KV (ordered)
    const vocab: string[] = (await kv.get<string[]>(keyOf(type))) || []
    const usage = Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }))
      .sort((a,b)=> a.tag.localeCompare(b.tag))
    const missing = usage.filter(u => !vocab.map(v=>v.toLowerCase()).includes(u.tag.toLowerCase())).map(u=>u.tag)
    return NextResponse.json({ success: true, type, vocab, usage, missing })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
