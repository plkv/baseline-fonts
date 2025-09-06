import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Font ID required' }, { status: 400 })
    }

    const success = await fontStorageClean.deleteFont(id)
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Font deleted successfully'
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ 
      error: 'Delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}