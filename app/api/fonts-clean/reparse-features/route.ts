import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Re-parsing all fonts for complete OpenType features...')

    // Get all existing fonts
    const allFonts = await fontStorageClean.getAllFonts()
    console.log(`Found ${allFonts.length} fonts to re-parse`)

    const results = []
    let updatedCount = 0
    let errorCount = 0

    for (const font of allFonts) {
      try {
        console.log(`\n🔍 Processing: ${font.family} - ${font.style} (${font.filename})`)

        // Download the original font file from blob storage
        const response = await fetch(font.blobUrl)
        if (!response.ok) {
          throw new Error(`Failed to download font: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        console.log(`  📁 Downloaded ${buffer.byteLength} bytes`)

        // Re-parse the font with enhanced parser
        const { parseFontFile } = await import('@/lib/font-parser')
        const parsedData = await parseFontFile(buffer, font.filename, font.fileSize)

        // Extract new feature data
        const oldFeatures = font.openTypeFeatures || []
        const newFeatures = parsedData.openTypeFeatures || []
        const oldTags = (font as any).openTypeFeatureTags || []
        const newTags = (parsedData as any).openTypeFeatureTags || []

        // Check if there are any differences
        const featuresChanged = JSON.stringify(oldFeatures.sort()) !== JSON.stringify(newFeatures.sort())
        const tagsChanged = JSON.stringify(oldTags) !== JSON.stringify(newTags)

        if (featuresChanged || tagsChanged) {
          console.log(`  ✨ Found updates for ${font.family}:`)
          console.log(`    📊 Features: ${oldFeatures.length} → ${newFeatures.length}`)
          console.log(`    🎨 Stylistic tags: ${oldTags.length} → ${newTags.length}`)

          if (newTags.length > oldTags.length) {
            const newTagsList = newTags.filter((nt: any) =>
              !oldTags.some((ot: any) => ot.tag === nt.tag)
            )
            console.log(`    🆕 New tags: ${newTagsList.map((t: any) => t.tag).join(', ')}`)
          }

          // Update the font in the database
          const success = await fontStorageClean.updateFont(font.id, {
            openTypeFeatures: newFeatures,
            // @ts-ignore - openTypeFeatureTags is supported
            openTypeFeatureTags: newTags
          })

          if (success) {
            updatedCount++
            results.push({
              id: font.id,
              family: font.family,
              style: font.style,
              oldFeatureCount: oldFeatures.length,
              newFeatureCount: newFeatures.length,
              oldTagCount: oldTags.length,
              newTagCount: newTags.length,
              newTags: newTags.map((t: any) => ({ tag: t.tag, title: t.title })),
              success: true
            })
            console.log(`    ✅ Updated successfully`)
          } else {
            errorCount++
            console.log(`    ❌ Failed to update database`)
          }
        } else {
          console.log(`  ℹ️ No changes needed`)
        }

      } catch (error) {
        errorCount++
        console.log(`  ❌ Error processing ${font.filename}: ${error}`)
        results.push({
          id: font.id,
          family: font.family,
          style: font.style,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`\n🎉 Re-parsing complete!`)
    console.log(`   📊 Total fonts: ${allFonts.length}`)
    console.log(`   ✅ Updated: ${updatedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   ℹ️ No changes: ${allFonts.length - updatedCount - errorCount}`)

    return NextResponse.json({
      success: true,
      message: `Re-parsed ${allFonts.length} fonts, updated ${updatedCount}`,
      stats: {
        total: allFonts.length,
        updated: updatedCount,
        errors: errorCount,
        noChanges: allFonts.length - updatedCount - errorCount
      },
      updatedFonts: results.filter(r => r.success && r.newTagCount > 0)
    })

  } catch (error) {
    console.error('❌ Re-parsing error:', error)
    return NextResponse.json({
      success: false,
      error: 'REPARSE_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
