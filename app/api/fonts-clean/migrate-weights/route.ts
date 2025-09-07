import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { parseFontFile } from '@/lib/font-parser'

/**
 * Migration endpoint to re-process all fonts with corrected weight detection
 * This fixes issues like ExtraBold being detected as weight 700 instead of 800
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting font weight migration...')
    
    // Get all fonts from storage
    const allFonts = await fontStorageClean.getAllFonts()
    console.log(`📋 Found ${allFonts.length} fonts to migrate`)
    
    let updated = 0
    let errors = 0
    
    for (const font of allFonts) {
      try {
        console.log(`🔄 Processing: ${font.family} ${font.style}`)
        
        // Get the font file URL (blob URL)
        const fontUrl = font.blobUrl
        if (!fontUrl) {
          console.log(`❌ No blob URL for ${font.family} ${font.style}`)
          errors++
          continue
        }
        
        // Download the font file
        const response = await fetch(fontUrl)
        if (!response.ok) {
          console.log(`❌ Failed to download ${font.family} ${font.style}`)
          errors++
          continue
        }
        
        const fontBuffer = await response.arrayBuffer()
        
        // Re-parse the font with corrected logic
        const parsedMetadata = await parseFontFile(fontBuffer, font.filename, fontBuffer.byteLength)
        
        // Check if weight actually changed
        const oldWeight = font.weight
        const newWeight = parsedMetadata.weight
        
        if (oldWeight !== newWeight) {
          console.log(`📝 ${font.family} ${font.style}: ${oldWeight} → ${newWeight}`)
          
          // Update the font with new metadata
          const updatedFont = {
            ...font,
            weight: parsedMetadata.weight,
            // Also update any other fields that might have been parsed incorrectly
            style: parsedMetadata.style,
            availableWeights: parsedMetadata.availableWeights,
            availableStyles: parsedMetadata.availableStyles,
            // Keep existing user editable fields
            foundry: font.foundry || parsedMetadata.foundry,
            category: font.category || parsedMetadata.category
          }
          
          await fontStorageClean.updateFont(font.id, updatedFont)
          updated++
        } else {
          console.log(`✅ ${font.family} ${font.style}: weight already correct (${oldWeight})`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${font.family} ${font.style}:`, error)
        errors++
      }
    }
    
    console.log(`✅ Migration complete: ${updated} fonts updated, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Font weight migration completed',
      results: {
        total: allFonts.length,
        updated: updated,
        errors: errors
      }
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}