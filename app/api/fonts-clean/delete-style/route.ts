import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function DELETE(req: NextRequest) {
  try {
    const { styleId } = await req.json()
    if (!styleId) {
      return NextResponse.json({ success: false, error: 'styleId required' }, { status: 400 })
    }
    const ok = await fontStorageClean.deleteStyleFromFamily(String(styleId))
    return NextResponse.json({ success: ok })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'DELETE_STYLE_FAILED' }, { status: 500 })
  }
}

