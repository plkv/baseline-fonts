import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Fixing specific collection assignments...')
    
    // Manual corrections based on font analysis
    const corrections = [
      // Nudles should be Weirdo (has experimental nature)
      { family: 'Nudles', targetCollection: 'Weirdo' as const },
      // N27 should be Display (has display characteristics)  
      { family: 'N27', targetCollection: 'Display' as const },
      // DatDot should be Display (has display characteristics)
      { family: 'DatDot', targetCollection: 'Display' as const },
      // RT Obligat has distinctive design, better as Display
      { family: 'RT Obligat', targetCollection: 'Display' as const },
    ]
    
    const results: any[] = []
    
    for (const correction of corrections) {
      console.log(`🔧 Setting ${correction.family} to ${correction.targetCollection}`)
      
      // Get all fonts in this family
      const familyFonts = await fontStorageClean.getFontsByFamily(correction.family)
      
      if (familyFonts.length === 0) {
        console.log(`⚠️ No fonts found for family: ${correction.family}`)
        continue
      }
      
      // Update all fonts in family to target collection
      const updates: any[] = []
      console.log(`Found ${familyFonts.length} fonts for family ${correction.family}`)
      
      for (const font of familyFonts) {
        console.log(`  Font ${font.style}: current collection = ${font.collection}`)
        if (font.collection !== correction.targetCollection) {
          console.log(`  Updating ${font.style} from ${font.collection} to ${correction.targetCollection}`)
          const success = await fontStorageClean.updateFont(font.id, {
            collection: correction.targetCollection
          })
          
          updates.push({
            id: font.id,
            style: font.style,
            from: font.collection,
            to: correction.targetCollection,
            success
          })
          
          if (success) {
            console.log(`  ✅ ${font.style}: ${font.collection} → ${correction.targetCollection}`)
          } else {
            console.log(`  ❌ Failed to update ${font.style}`)
          }
        } else {
          console.log(`  ${font.style} already in correct collection: ${font.collection}`)
        }
      }
      
      results.push({
        family: correction.family,
        targetCollection: correction.targetCollection,
        totalFonts: familyFonts.length,
        updates
      })
    }
    
    console.log('✅ Specific collection fixes complete')
    
    return NextResponse.json({
      success: true,
      message: 'Fixed specific collection assignments',
      corrections: results
    })
    
  } catch (error) {
    console.error('❌ Specific collection fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'SPECIFIC_FIX_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}