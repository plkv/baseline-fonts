import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import type { FontFamily } from '@/lib/models/FontFamily'
import type { FontVariant } from '@/lib/models/FontVariant'

// Helper to normalize a single font record coming from storage
function toVariant(font: any, familyId: string): FontVariant {
  return {
    id: font.id || `variant_${familyId}_${font.filename}`,
    familyId,
    filename: font.filename,
    weight: font.weight || 400,
    isItalic: Boolean(font.italicStyle) || /italic|oblique/i.test(font.style || ''),
    styleName: font.style || 'Regular',
    blobUrl: font.url || font.blobUrl,
    fileSize: font.fileSize || 0,
    format: (font.format || 'woff2').toString(),
    isVariable: Boolean(font.isVariable),
    variableAxes: font.variableAxes || [],
    openTypeFeatures: Array.isArray(font.openTypeFeatures) ? font.openTypeFeatures : [],
    fontMetrics: font.fontMetrics,
    glyphCount: font.glyphCount,
    uploadedAt: font.uploadedAt || new Date().toISOString(),
    originalFilename: font.originalFilename || font.filename,
    isDefaultStyle: Boolean(font.isDefaultStyle),
    published: true,
  }
}

export async function GET() {
  try {
    const fonts = await fontStorageClean.getAllFonts()

    // Group by family name
    const byFamily = new Map<string, any[]>()
    for (const f of fonts) {
      const familyName = (f.family || f.name || 'Unknown').toString()
      if (!byFamily.has(familyName)) byFamily.set(familyName, [])
      byFamily.get(familyName)!.push(f)
    }

    // Build normalized families
    const families: FontFamily[] = Array.from(byFamily.entries()).map(([familyName, familyFonts]) => {
      // Representative for family-level metadata
      const representative =
        familyFonts.find((ff) => ff.isDefaultStyle) ||
        familyFonts.find((ff) => !/italic|oblique/i.test(ff.style || '')) ||
        familyFonts[0]

      const familyId = `family_${familyName}`
      const variants: FontVariant[] = familyFonts.map((ff) => toVariant(ff, familyId))

      const defaultVariant = variants.find((v) => v.isDefaultStyle)

      const family: FontFamily = {
        id: familyId,
        name: familyName,
        collection: representative?.collection || 'Text',
        styleTags: Array.isArray(representative?.styleTags) ? representative!.styleTags : [],
        languages: Array.isArray(representative?.languages) && representative!.languages.length
          ? representative!.languages
          : ['Latin'],
        category: Array.isArray(representative?.category)
          ? representative!.category
          : [representative?.category || 'Sans'],
        foundry: representative?.foundry || 'Unknown',
        defaultVariantId: defaultVariant?.id,
        isVariable: variants.some((v) => v.isVariable),
        variants,
        published: true,
        createdAt: representative?.uploadedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: representative?.description,
        designerInfo: representative?.designerInfo,
        downloadLink: representative?.downloadLink,
        licenseInfo: undefined,
      }

      return family
    })

    return NextResponse.json({ success: true, families, totalFamilies: families.length, totalFiles: fonts.length })
  } catch (error) {
    console.error('Families list error:', error)
    return NextResponse.json(
      { error: 'Failed to build families', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

