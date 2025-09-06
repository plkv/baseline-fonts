import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function DELETE(request: NextRequest) {
  try {
    const { styleId } = await request.json()
    
    if (!styleId) {
      return NextResponse.json({ 
        error: 'Style ID is required' 
      }, { status: 400 })
    }

    const success = await fontStorageClean.deleteStyleFromFamily(styleId)
    
    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to delete style or style not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Style deleted successfully' 
    })

  } catch (error) {
    console.error('Delete style error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete style',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}