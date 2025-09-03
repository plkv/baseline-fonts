import { NextRequest, NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    const success = await vercelFontStorage.removeFont(filename)
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Font deleted successfully' 
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete font' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ 
      error: 'Font deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}