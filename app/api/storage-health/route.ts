import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { put as blobPut, del as blobDel } from '@vercel/blob'
import { fontStorageClean } from '@/lib/font-storage-clean'

async function checkKV() {
  try {
    const key = `healthcheck:${Date.now()}`
    await kv.set(key, 'ok')
    const val = await kv.get<string>(key)
    await kv.del(key)
    return { ok: val === 'ok' }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

async function checkBlobViaUpload() {
  try {
    const filename = `health-${Date.now()}.txt`
    const blob = await blobPut(filename, new Blob(['ok']), {
      access: 'public',
      addRandomSuffix: true,
    })
    // Probe the created blob URL
    const head = await fetch(blob.url, { method: 'HEAD', cache: 'no-store' })
    const ok = head.ok
    // Cleanup
    await blobDel(blob.url)
    return { ok, url: blob.url, status: head.status }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

async function checkBlobViaExisting() {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    const any = fonts.find((f) => f.blobUrl)
    if (!any) return { ok: false, error: 'no fonts with blobUrl found' }
    const head = await fetch(any.blobUrl, { method: 'HEAD', cache: 'no-store' })
    return { ok: head.ok, url: any.blobUrl, status: head.status }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function GET() {
  try {
    const [kvRes, blobExisting, blobUpload] = await Promise.all([
      checkKV(),
      checkBlobViaExisting(),
      checkBlobViaUpload(),
    ])

    // Also summarize dataset
    let dataset: { totalFonts: number; families: number } = { totalFonts: 0, families: 0 }
    try {
      const fonts = await fontStorageClean.getAllFonts()
      dataset.totalFonts = fonts.length
      const fams = new Set(fonts.map((f) => f.family))
      dataset.families = fams.size
    } catch {}

    return NextResponse.json({
      success: true,
      kv: kvRes,
      blob: {
        existing: blobExisting,
        upload: blobUpload,
      },
      dataset,
      supabase: { ok: false, note: 'Supabase not configured in this project' },
    })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

