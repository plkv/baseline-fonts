/**
 * Font Family Delete - Delete entire font families
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  console.log('🗑️ Font family delete request')
  
  try {
    const { searchParams } = new URL(request.url)
    const familyName = searchParams.get('family')
    
    if (!familyName) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_FAMILY_NAME',
        message: 'Family name is required for family deletion'
      }, { status: 400 })
    }
    
    console.log(`🗑️ Deleting entire family: ${familyName}`)
    
    // Get all fonts in the family
    const allFonts = await fontStorageV2.getAllFonts()
    const familyFonts = allFonts.filter(f => f.family === familyName)
    
    if (familyFonts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FAMILY_NOT_FOUND',
        message: `Font family "${familyName}" not found`
      }, { status: 404 })
    }
    
    // Delete all fonts in the family
    let deletedCount = 0
    let failedCount = 0
    const deletionResults = []
    
    for (const font of familyFonts) {
      try {
        const success = await fontStorageV2.removeFont(font.filename)
        if (success) {
          deletedCount++
          deletionResults.push({ filename: font.filename, status: 'deleted' })
          console.log(`  ✅ Deleted: ${font.filename}`)
        } else {
          failedCount++
          deletionResults.push({ filename: font.filename, status: 'failed' })
          console.warn(`  ❌ Failed to delete: ${font.filename}`)
        }
      } catch (error) {
        failedCount++
        deletionResults.push({ 
          filename: font.filename, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        console.error(`  ❌ Error deleting ${font.filename}:`, error)
      }
    }
    
    const duration = Date.now() - startTime
    const success = failedCount === 0
    
    if (success) {
      console.log(`✅ Family "${familyName}" completely deleted (${deletedCount} fonts) in ${duration}ms`)
      return NextResponse.json({
        success: true,
        message: `Font family "${familyName}" deleted successfully`,
        details: {
          familyName,
          totalFonts: familyFonts.length,
          deletedCount,
          failedCount: 0
        },
        deletionResults,
        performance: {
          deleteTime: duration
        }
      })
    } else {
      console.warn(`⚠️ Family "${familyName}" partially deleted: ${deletedCount}/${familyFonts.length} fonts`)
      return NextResponse.json({
        success: false,
        error: 'PARTIAL_DELETION',
        message: `Family "${familyName}" partially deleted: ${deletedCount}/${familyFonts.length} fonts`,
        details: {
          familyName,
          totalFonts: familyFonts.length,
          deletedCount,
          failedCount
        },
        deletionResults,
        performance: {
          deleteTime: duration
        }
      }, { status: 207 }) // 207 Multi-Status for partial success
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Font family delete error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'FAMILY_DELETE_ERROR',
      message: 'Font family deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        failureTime: duration
      }
    }, { status: 500 })
  }
}