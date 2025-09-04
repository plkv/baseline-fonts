/**
 * Font Delete V2 - Bulletproof Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  console.log('🗑️ Font delete V2 request')
  
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_FILENAME',
        message: 'Filename is required for deletion'
      }, { status: 400 })
    }
    
    console.log(`🗑️ Deleting font: ${filename}`)
    
    // Delete font using V2 storage
    const success = await fontStorageV2.removeFont(filename)
    
    const duration = Date.now() - startTime
    
    if (success) {
      console.log(`✅ Font deleted successfully in ${duration}ms`)
      return NextResponse.json({
        success: true,
        message: `Font "${filename}" deleted successfully`,
        performance: {
          deleteTime: duration
        }
      })
    } else {
      console.warn(`⚠️ Font deletion failed: ${filename}`)
      return NextResponse.json({
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete font "${filename}"`,
        performance: {
          failureTime: duration
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Font delete error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Font deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        failureTime: duration
      }
    }, { status: 500 })
  }
}