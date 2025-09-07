import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

/**
 * Migration endpoint to convert single categories to arrays
 * Migrates from category: 'Sans' to category: ['Sans']
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting category migration...')
    
    // Get all fonts from storage
    const allFonts = await fontStorageClean.getAllFonts()
    console.log(`📋 Found ${allFonts.length} fonts to migrate`)
    
    let updated = 0
    let errors = 0
    
    for (const font of allFonts) {
      try {
        console.log(`🔄 Processing: ${font.family} ${font.style}`)
        
        // Check if category is still a string (needs migration)
        if (typeof font.category === 'string') {
          console.log(`📝 ${font.family} ${font.style}: "${font.category}" → ["${font.category}"]`)
          
          // Update the font with array category
          const updatedFont = {
            ...font,
            category: [font.category] // Convert string to array
          }
          
          await fontStorageClean.updateFont(font.id, updatedFont)
          updated++
        } else if (Array.isArray(font.category)) {
          console.log(`✅ ${font.family} ${font.style}: already array format`)
        } else {
          console.log(`⚠️ ${font.family} ${font.style}: no category found, setting default`)
          // Set default category if none exists
          const updatedFont = {
            ...font,
            category: ['Sans'] // Default category array
          }
          
          await fontStorageClean.updateFont(font.id, updatedFont)
          updated++
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${font.family} ${font.style}:`, error)
        errors++
      }
    }
    
    console.log(`✅ Migration complete: ${updated} fonts updated, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Category migration completed',
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