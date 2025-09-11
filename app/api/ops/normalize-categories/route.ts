import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { normalizeCategoryList } from '@/lib/category-utils'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST() {
  try {
    const all = await fontStorageClean.getAllFonts()
    let updated = 0
    for (const f of all as any[]) {
      const collection = (f.collection as any) || 'Text'
      const normalized = normalizeCategoryList(f.category)
      if (normalized.length && JSON.stringify(normalized.sort()) !== JSON.stringify((f.category||[]).slice().sort())) {
        try {
          await fontStorageClean.updateFont(f.id, { category: normalized } as any)
          updated++
        } catch {}
      }
    }
    return NextResponse.json({ success: true, updated, total: all.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
