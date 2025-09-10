import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST() {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    let updated = 0
    for (const f of fonts as any[]) {
      const src = f.blobUrl || f.url || f.blob || null
      if (!f.blobUrl && src) {
        await fontStorageClean.updateFont(f.id, { blobUrl: src } as any)
        updated++
      }
    }
    return NextResponse.json({ success: true, checked: fonts.length, updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

