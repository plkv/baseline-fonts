import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST() {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    let updated = 0
    for (const f of fonts) {
      const hasBlob = Boolean((f as any).blobUrl)
      const hasUrl = Boolean((f as any).url)
      if (!hasBlob && hasUrl) {
        await fontStorageClean.updateFont(f.id, { blobUrl: (f as any).url } as any)
        updated++
      }
    }
    return NextResponse.json({ success: true, checked: fonts.length, updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

