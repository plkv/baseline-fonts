import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { get } from '@vercel/blob'
import { parseFontFile } from '@/lib/font-parser'

const FONTS_KEY = 'fonts:all'

/**
 * Re-parse variable axes for all fonts to fix default values
 * This endpoint fetches all fonts, re-parses their variable axes, and updates metadata
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting variable axes re-parse for all fonts...')

    // Fetch all fonts from KV
    const fonts = await kv.get<any[]>(FONTS_KEY)
    if (!fonts || !Array.isArray(fonts)) {
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
        if (font.type !== 'Variable' || !font.url) {
          console.log(`⏭️  Skipping ${font.name} (not variable or no URL)`)
          continue
        }

        console.log(`🔍 Re-parsing ${font.name}...`)

        // Fetch the font file from blob
        const blob = await get(font.url)
        if (!blob) {
          throw new Error(`Failed to fetch blob for ${font.name}`)
        }

        // Download the blob content
        const arrayBuffer = await blob.arrayBuffer()

        // Re-parse the font
        const metadata = await parseFontFile(
          arrayBuffer,
          font.filename || `${font.name}.ttf`,
          blob.size
        )

        // Update only the variableAxes field in the existing font object
        if (metadata.variableAxes && metadata.variableAxes.length > 0) {
          font.variableAxes = metadata.variableAxes
          updatedCount++
          console.log(`✅ Updated ${font.name} with ${metadata.variableAxes.length} axes`)
          console.log(`   Axes:`, metadata.variableAxes.map(a => `${a.axis}=${a.default}`).join(', '))
        } else {
          console.log(`⚠️  ${font.name} has no variable axes in re-parsed metadata`)
        }

      } catch (fontError: any) {
        errorCount++
        const errorMsg = `Error processing ${font.name}: ${fontError.message}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    // Save updated fonts back to KV
    if (updatedCount > 0) {
      await kv.set(FONTS_KEY, fonts)
      console.log(`💾 Saved updated metadata for ${updatedCount} fonts`)
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
  const fonts = await kv.get<any[]>(FONTS_KEY)
  const variableFonts = fonts?.filter(f => f.type === 'Variable') || []

  return NextResponse.json({
    totalFonts: fonts?.length || 0,
    variableFonts: variableFonts.length,
    message: 'Use POST to trigger re-parse'
  })
}
