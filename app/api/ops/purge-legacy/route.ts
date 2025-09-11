import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { fontStorageV2 } = await import('@/lib/font-storage-v2')
    const legacy = await fontStorageV2.getAllFonts()
    let deleted = 0
    for (const f of legacy as any[]) {
      try { await fontStorageV2.removeFont(f.filename); deleted++ } catch {}
    }
    return NextResponse.json({ success: true, deleted, total: legacy.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

