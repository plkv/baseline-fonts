import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const familyOverride = (formData.get('family') as string) || undefined
    const collectionSel = ((formData.get('collection') as string) || 'Text') as 'Text'|'Display'|'Weirdo'
    const { normalizeCategoryList } = await import('@/lib/category-utils')
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 })
    }

    const results: Array<{ filename: string; id?: string; family?: string; ok: boolean; error?: string }> = []

    for (const file of files) {
      try {
        const meta = await fontStorageClean.uploadFont(file, true, familyOverride)
        // Ensure selected collection is set
        await fontStorageClean.updateFont(meta.id, { collection: collectionSel } as any)
        // Normalize categories and persist
        const normalizedCats = normalizeCategoryList((meta as any).category)
        if (normalizedCats.length) {
          await fontStorageClean.updateFont(meta.id, { category: normalizedCats } as any)
          // ensure vocab includes these
          try {
            const res = await fetch(`${req.nextUrl.origin}/api/tags/vocab?type=category&collection=${collectionSel}`)
            const data = await res.json()
            const list: string[] = Array.isArray(data.list) ? data.list : []
            const merged = Array.from(new Set([ ...list, ...normalizedCats ])).sort((a,b)=>a.localeCompare(b))
            await fetch(`${req.nextUrl.origin}/api/tags/vocab`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ type: 'category', collection: collectionSel, list: merged }) })
          } catch {}
        }
        results.push({ filename: file.name, id: meta.id, family: meta.family, ok: true })
      } catch (e: any) {
        results.push({ filename: file.name, ok: false, error: e?.message || String(e) })
      }
    }

    const ok = results.filter(r => r.ok).length
    return NextResponse.json({ success: true, uploaded: ok, total: results.length, results })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
