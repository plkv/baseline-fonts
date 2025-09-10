import { NextRequest } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import type { FontFamily } from '@/lib/models/FontFamily'
import type { FontVariant } from '@/lib/models/FontVariant'
import { buildFontCSS } from '@/lib/font-css'

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

function buildFamiliesFromFonts(fonts: any[]): FontFamily[] {
  const byFamily = new Map<string, any[]>()
  for (const f of fonts) {
    const familyName = (f.family || f.name || 'Unknown').toString()
    if (!byFamily.has(familyName)) byFamily.set(familyName, [])
    byFamily.get(familyName)!.push(f)
  }

  return Array.from(byFamily.entries()).map(([familyName, familyFonts]) => {
    const representative =
      familyFonts.find((ff) => ff.isDefaultStyle) ||
      familyFonts.find((ff) => !/italic|oblique/i.test(ff.style || '')) ||
      familyFonts[0]

    const familyId = `family_${familyName}`
    const variants: FontVariant[] = familyFonts.map((ff) => toVariant(ff, familyId))

    // Build unions for filter facets
    const union = {
      languages: new Set<string>(),
      categories: new Set<string>(),
      styleTags: new Set<string>(),
    }
    for (const f of familyFonts) {
      if (Array.isArray(f.languages)) f.languages.forEach((l: string) => union.languages.add(l))
      else union.languages.add('Latin')
      if (Array.isArray(f.category)) f.category.forEach((c: string) => union.categories.add(c))
      else if (typeof f.category === 'string' && f.category) union.categories.add(f.category)
      if (Array.isArray(f.styleTags)) f.styleTags.forEach((s: string) => union.styleTags.add(s))
      if (!Array.isArray(f.styleTags) || f.styleTags.length === 0) {
        if (f.collection === 'Display') union.styleTags.add('Display')
        if (Array.isArray(f.category)) {
          if (f.category.includes('Serif')) union.styleTags.add('Serif')
          if (f.category.includes('Sans')) union.styleTags.add('Sans Serif')
          if (f.category.includes('Mono')) union.styleTags.add('Monospace')
          if (f.category.includes('Script')) union.styleTags.add('Script')
          if (f.category.includes('Decorative')) union.styleTags.add('Decorative')
        }
      }
    }

    const family: FontFamily = {
      id: familyId,
      name: familyName,
      collection: representative?.collection || 'Text',
      styleTags: Array.from(union.styleTags),
      languages: Array.from(union.languages.size ? union.languages : new Set(['Latin'])),
      category: Array.from(union.categories.size ? union.categories : new Set(['Sans'])),
      foundry: representative?.foundry || 'Unknown',
      defaultVariantId: variants.find((v) => v.isDefaultStyle)?.id,
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
}

function hashString(input: string): string {
  // Simple non-cryptographic hash for ETag
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return `W/"${(h >>> 0).toString(16)}-${input.length}"`
}

export async function GET(_req: NextRequest) {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    const families = buildFamiliesFromFonts(fonts)
    const css = buildFontCSS(families)
    const etag = hashString(css)

    return new Response(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        ETag: etag,
      },
    })
  } catch (e) {
    console.error('font-css error', e)
    return new Response('/* Failed to build font CSS */', {
      status: 500,
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    })
  }
}

