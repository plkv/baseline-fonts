import { NextRequest, NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    const success = await vercelFontStorage.updateFontMetadata(filename, updates)
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Font metadata updated successfully' 
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to update font metadata' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}