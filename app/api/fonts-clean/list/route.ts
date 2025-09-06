import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function GET(request: NextRequest) {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    
    return NextResponse.json({ 
      success: true, 
      fonts,
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