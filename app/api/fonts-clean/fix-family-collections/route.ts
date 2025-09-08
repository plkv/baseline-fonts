import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Fixing family collection consistency...')
    
    // Get all fonts and group by family
    const allFonts = await fontStorageClean.getAllFonts()
    const fontsByFamily = new Map<string, any[]>()
    
    allFonts.forEach(font => {
      const familyName = font.family
      if (!fontsByFamily.has(familyName)) {
        fontsByFamily.set(familyName, [])
      }
      fontsByFamily.get(familyName)!.push(font)
    })
    
    const results: any[] = []
    
    for (const [familyName, familyFonts] of fontsByFamily.entries()) {
      // Check if family has mixed collections
      const collections = [...new Set(familyFonts.map(f => f.collection))]
      
      if (collections.length > 1) {
        console.log(`🔧 Family "${familyName}" has mixed collections: ${collections.join(', ')}`)
        
        // Determine the target collection (prefer Display > Weirdo > Text)
        let targetCollection = 'Text'
        if (collections.includes('Display')) {
          targetCollection = 'Display'
        } else if (collections.includes('Weirdo')) {
          targetCollection = 'Weirdo'
        }
        
        console.log(`   → Setting all fonts to: ${targetCollection}`)
        
        const updates: any[] = []
        for (const font of familyFonts) {
          if (font.collection !== targetCollection) {
            console.log(`   Updating ${font.style}: ${font.collection} → ${targetCollection}`)
            const success = await fontStorageClean.updateFont(font.id, {
              collection: targetCollection
            })
            
            updates.push({
              id: font.id,
              style: font.style,
              from: font.collection,
              to: targetCollection,
              success
            })
          }
        }
        
        results.push({
          family: familyName,
          targetCollection,
          mixedCollections: collections,
          updates
        })
      }
    }
    
    console.log(`✅ Family collection consistency complete. Fixed ${results.length} families.`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed collection consistency for ${results.length} families`,
      families: results
    })
    
  } catch (error) {
    console.error('❌ Family collection fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'FAMILY_FIX_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}