/**
 * Font List V2 - Bulletproof Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('📋 Font list V2 request')
  
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'
    
    // Get all fonts with error handling
    const allFonts = await fontStorageV2.getAllFonts()
    
    // Filter published fonts unless admin view
    const fonts = includeUnpublished 
      ? allFonts 
      : allFonts.filter(font => font.published !== false)
    
    const duration = Date.now() - startTime
    console.log(`✅ Font list loaded: ${fonts.length} fonts in ${duration}ms`)
    
    // Get storage info for diagnostics
    const storageInfo = fontStorageV2.getStorageInfo()
    
    return NextResponse.json({
      success: true,
      fonts,
      total: fonts.length,
      storage: storageInfo,
      performance: {
        loadTime: duration
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Font list error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'FONT_LIST_ERROR',
      message: 'Failed to load fonts',
      details: error instanceof Error ? error.message : 'Unknown error',
      fonts: [], // Graceful fallback
      total: 0,
      performance: {
        failureTime: duration
      }
    }, { status: 500 })
  }
}