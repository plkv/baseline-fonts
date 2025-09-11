import { NextResponse } from 'next/server'
import { getAllKnownFonts } from '@/lib/all-fonts'
import { normalizeCategoryList } from '@/lib/category-utils'

export async function POST() {
  try {
    const all = await getAllKnownFonts()
    let updated = 0
    for (const f of all as any[]) {
      const collection = (f.collection as any) || 'Text'
      const normalized = normalizeCategoryList(f.category)
      if (normalized.length && JSON.stringify(normalized.sort()) !== JSON.stringify((f.category||[]).slice().sort())) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/fonts-clean/update`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id: f.id, updates: { category: normalized } }) })
          updated++
        } catch {}
      }
    }
    return NextResponse.json({ success: true, updated, total: all.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

