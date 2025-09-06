import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function GET(request: NextRequest) {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    
    // Transform fonts to match frontend expectations
    const transformedFonts = fonts.map(font => ({
      ...font,
      name: font.family, // Frontend expects 'name' property
      url: font.blobUrl,  // Frontend expects 'url' property
      // Keep original properties too for compatibility
    }))
    
    return NextResponse.json({ 
      success: true, 
      fonts: transformedFonts,
      total: fonts.length
    })

  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json({ 
      error: 'Failed to load fonts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}