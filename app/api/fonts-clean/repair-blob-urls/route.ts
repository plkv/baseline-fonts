import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(_req: NextRequest) {
  try {
    const blob = await import('@vercel/blob')
    // List all blobs under fonts/ once
    const { blobs } = await blob.list({ prefix: 'fonts/' })
    const byFilename = new Map<string, string>()
    for (const b of blobs) {
      const parts = b.pathname.split('/')
      const fname = parts[parts.length - 1]
      if (fname) byFilename.set(fname, b.url)
    }

    const fonts = await fontStorageClean.getAllFonts()
    let updated = 0
    const missing: Array<{ id: string; filename: string }> = []
    for (const f of fonts) {
      const hasBlob = Boolean((f as any).blobUrl)
      const hasUrl = Boolean((f as any).url)
      if (hasBlob || hasUrl) continue
      const url = byFilename.get(f.filename)
      if (url) {
        await fontStorageClean.updateFont(f.id, { blobUrl: url } as any)
        updated++
      } else {
        missing.push({ id: f.id, filename: f.filename })
      }
    }
    return NextResponse.json({ success: true, checked: fonts.length, updated, missing })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

