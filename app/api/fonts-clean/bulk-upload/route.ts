import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const familyOverride = (formData.get('family') as string) || undefined
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 })
    }

    const results: Array<{ filename: string; id?: string; family?: string; ok: boolean; error?: string }> = []

    for (const file of files) {
      try {
        const meta = await fontStorageClean.uploadFont(file, true, familyOverride)
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
