import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST() {
  try {
    let deletedClean = 0
    try {
      const clean = await fontStorageClean.getAllFonts()
      for (const f of clean) {
        try { await fontStorageClean.deleteFont(f.id); deletedClean++ } catch {}
      }
    } catch {}

    let deletedLegacy = 0
    try {
      const { fontStorageV2 } = await import('@/lib/font-storage-v2')
      const legacy = await fontStorageV2.getAllFonts()
      for (const f of legacy as any[]) {
        try { await fontStorageV2.removeFont(f.filename); deletedLegacy++ } catch {}
      }
    } catch {}

    return NextResponse.json({ success: true, deleted: { clean: deletedClean, legacy: deletedLegacy } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

