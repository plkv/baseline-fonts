import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { parseFontFile } from '@/lib/font-parser'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { kv } from '@vercel/kv'

/**
 * Re-parse variable axes for all fonts to fix default values
 * This endpoint fetches all fonts, re-parses their variable axes, and updates metadata
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting variable axes re-parse for all fonts...')

    // Fetch all fonts using the storage system
    const fonts = await fontStorageClean.getAllFonts()
    if (!fonts || !Array.isArray(fonts) || fonts.length === 0) {
      return NextResponse.json({ error: 'No fonts found in database' }, { status: 404 })
    }

    console.log(`📚 Found ${fonts.length} fonts in database`)

    let updatedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each font
    for (const font of fonts) {
      try {
        // Only process variable fonts with a blob URL
        const blobUrl = font.blobUrl || font.url
        if (!font.isVariable || !blobUrl) {
          console.log(`⏭️  Skipping ${font.family} (not variable or no URL)`)
          continue
        }

        console.log(`🔍 Re-parsing ${font.family}...`)

        // Fetch the font file from blob
        const blob = await get(blobUrl)
        if (!blob) {
          throw new Error(`Failed to fetch blob for ${font.family}`)
        }

        // Download the blob content
        const arrayBuffer = await blob.arrayBuffer()

        // Re-parse the font
        const metadata = await parseFontFile(
          arrayBuffer,
          font.filename || `${font.family}.ttf`,
          blob.size
        )

        // Update only the variableAxes field in the existing font object
        if (metadata.variableAxes && metadata.variableAxes.length > 0) {
          // Update the font in KV directly
          const updatedFont = { ...font, variableAxes: metadata.variableAxes }
          await kv.set(font.id, updatedFont)

          updatedCount++
          console.log(`✅ Updated ${font.family} with ${metadata.variableAxes.length} axes`)
          console.log(`   Axes:`, metadata.variableAxes.map(a => `${a.axis}=${a.default}`).join(', '))
        } else {
          console.log(`⚠️  ${font.family} has no variable axes in re-parsed metadata`)
        }

      } catch (fontError: any) {
        errorCount++
        const errorMsg = `Error processing ${font.family || 'unknown'}: ${fontError.message}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    // Invalidate cache to force reload
    if (updatedCount > 0) {
      await kv.del('fonts_cache')
      console.log(`💾 Updated ${updatedCount} fonts and invalidated cache`)
    }

    return NextResponse.json({
      success: true,
      message: `Re-parsed variable axes for ${updatedCount} fonts`,
      totalFonts: fonts.length,
      updatedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ Re-parse error:', error)
    return NextResponse.json(
      { error: 'Failed to re-parse fonts', details: error.message },
      { status: 500 }
    )
  }
}

// Allow GET to check status
export async function GET(request: NextRequest) {
  const fonts = await fontStorageClean.getAllFonts()
  const variableFonts = fonts?.filter(f => f.isVariable) || []

  return NextResponse.json({
    totalFonts: fonts?.length || 0,
    variableFonts: variableFonts.length,
    message: 'Use POST to trigger re-parse'
  })
}
