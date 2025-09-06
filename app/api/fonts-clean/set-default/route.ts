import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    const { familyName, styleId } = await request.json()
    
    if (!familyName || !styleId) {
      return NextResponse.json({ 
        error: 'Family name and style ID are required' 
      }, { status: 400 })
    }

    const success = await fontStorageClean.setDefaultStyle(familyName, styleId)
    
    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to set default style' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Default style set for ${familyName}` 
    })

  } catch (error) {
    console.error('Set default style error:', error)
    return NextResponse.json({ 
      error: 'Failed to set default style',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}