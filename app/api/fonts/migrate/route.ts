import { NextRequest, NextResponse } from 'next/server'
import { blobOnlyStorage } from '@/lib/blob-only-storage'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting font migration to Vercel Blob...')
    
    // Get all fonts from blob storage (no migration needed - already in blob)
    const existingFonts = await blobOnlyStorage.getAllFonts()
    console.log(`📋 Found ${existingFonts.length} fonts already in blob storage`)
    
    // Check for local fonts that might need migration
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    let localFontFiles: string[] = []
    
    try {
      localFontFiles = (await fs.readdir(fontsDir))
        .filter(file => file.match(/\.(ttf|otf|woff|woff2)$/i))
        .filter(file => !existingFonts.some(font => font.filename === file))
    } catch {
      console.log('📝 No local fonts directory found')
    }
    
    if (localFontFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All fonts already in blob storage - no migration needed',
        existing: existingFonts.length,
        migrated: 0
      })
    }

    const migrationResults = []
    let successCount = 0
    let errorCount = 0

    for (const filename of localFontFiles) {
      try {
        console.log(`🔄 Migrating local file: ${filename}`)
        
        const fontPath = path.join(fontsDir, filename)
        const fontBuffer = await fs.readFile(fontPath)
        
        // Parse font to extract metadata
        const fontParser = require('@/lib/font-parser')
        const metadata = await fontParser.parseFontBuffer(fontBuffer.buffer, filename)
        
        // Store in blob storage
        const migratedFont = await blobOnlyStorage.storeFont(metadata, fontBuffer.buffer)
        
        migrationResults.push({
          filename: filename,
          family: migratedFont.family,
          status: 'success',
          newUrl: migratedFont.url
        })
        
        successCount++
        console.log(`✅ Migrated: ${migratedFont.family} -> ${migratedFont.url}`)
        
      } catch (migrationError) {
        console.error(`❌ Migration failed for ${filename}:`, migrationError)
        migrationResults.push({
          filename: filename,
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
      existing: existingFonts.length,
      total: localFontFiles.length,
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