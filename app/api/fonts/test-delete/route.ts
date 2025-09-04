/**
 * Debug Delete Test Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function GET(request: NextRequest) {
  try {
    // Get all fonts to see what we have
    const allFonts = await fontStorageV2.getAllFonts()
    
    // Get storage info
    const storageInfo = fontStorageV2.getStorageInfo()
    
    return NextResponse.json({
      success: true,
      storageInfo,
      totalFonts: allFonts.length,
      fonts: allFonts.map(f => ({
        filename: f.filename,
        family: f.family,
        name: f.name
      }))
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'Filename required'
      }, { status: 400 })
    }
    
    console.log(`🧪 TEST DELETE: ${filename}`)
    
    // Get storage info first
    const storageInfo = fontStorageV2.getStorageInfo()
    console.log('Storage info:', storageInfo)
    
    // Try to find the font first
    const allFonts = await fontStorageV2.getAllFonts()
    const targetFont = allFonts.find(f => f.filename === filename)
    
    if (!targetFont) {
      return NextResponse.json({
        success: false,
        error: 'Font not found',
        availableFonts: allFonts.map(f => f.filename)
      }, { status: 404 })
    }
    
    // Try the deletion
    console.log(`🧪 Attempting deletion of: ${filename}`)
    const success = await fontStorageV2.removeFont(filename)
    console.log(`🧪 Deletion result: ${success}`)
    
    return NextResponse.json({
      success,
      message: success ? 'Font deleted successfully' : 'Deletion failed',
      storageInfo,
      targetFont: {
        filename: targetFont.filename,
        family: targetFont.family,
        name: targetFont.name
      }
    })
    
  } catch (error) {
    console.error('🧪 TEST DELETE ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}