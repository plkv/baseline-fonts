import { NextRequest, NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'
import { fontStorage } from '@/lib/font-database'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting font migration to Vercel Blob...')
    
    // Get all fonts from local storage
    const localFonts = await fontStorage.getAllFonts()
    console.log(`📋 Found ${localFonts.length} fonts in local storage`)
    
    if (localFonts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No fonts to migrate',
        migrated: 0
      })
    }

    const migrationResults = []
    let successCount = 0
    let errorCount = 0

    for (const font of localFonts) {
      try {
        console.log(`🔄 Migrating: ${font.family} (${font.filename})`)
        
        // Check if font file exists locally
        const fontPath = path.join(process.cwd(), 'public', 'fonts', font.filename)
        
        try {
          // Read the font file
          const fontBuffer = await fs.readFile(fontPath)
          
          // Upload to Vercel Blob using existing metadata
          const migratedFont = await vercelFontStorage.addFont(font, fontBuffer.buffer)
          
          migrationResults.push({
            filename: font.filename,
            family: font.family,
            status: 'success',
            oldUrl: font.url,
            newUrl: migratedFont.url
          })
          
          successCount++
          console.log(`✅ Migrated: ${font.family} -> ${migratedFont.url}`)
          
        } catch (fileError) {
          console.warn(`⚠️ Font file not found: ${font.filename}`)
          migrationResults.push({
            filename: font.filename,
            family: font.family,
            status: 'file_not_found',
            error: 'Font file not found in local storage'
          })
          errorCount++
        }
        
      } catch (migrationError) {
        console.error(`❌ Migration failed for ${font.filename}:`, migrationError)
        migrationResults.push({
          filename: font.filename,
          family: font.family,
          status: 'error',
          error: migrationError instanceof Error ? migrationError.message : 'Unknown error'
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${successCount} successful, ${errorCount} failed`,
      migrated: successCount,
      failed: errorCount,
      total: localFonts.length,
      results: migrationResults
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      error: 'Font migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}