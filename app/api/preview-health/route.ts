import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { buildFontCSS } from '@/lib/font-css'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

export async function GET() {
  try {
    const fonts = await fontStorageClean.getAllFonts()
    const byFamily = new Map<string, any[]>()
    for (const f of fonts) {
      const name = (f.family || f.name || 'Unknown').toString()
      if (!byFamily.has(name)) byFamily.set(name, [])
      byFamily.get(name)!.push(f)
    }
    const families = Array.from(byFamily.entries()).map(([name, variants]) => {
      const canonical = canonicalFamilyName(name)
      const alias = `${canonical}-${shortHash(canonical).slice(0,6)}`
      const stats = variants.map((v) => ({
        id: v.id,
        filename: v.filename,
        blobUrl: v.blobUrl || v.url,
        format: v.format,
        isVariable: Boolean(v.isVariable),
        weight: v.weight,
        style: v.style,
        hasUrl: Boolean(v.blobUrl || v.url),
      }))
      const hasAnyUrl = stats.some((s) => s.hasUrl)
      return { family: name, alias, canonical, variants: stats, hasAnyUrl }
    })

    // Also generate CSS length for sanity
    const css = buildFontCSS(
      families.map((f) => ({
        id: `family_${f.canonical}`,
        name: f.family,
        collection: 'Text',
        styleTags: [],
        languages: ['Latin'],
        category: ['Sans'],
        foundry: 'Unknown',
        defaultVariantId: undefined,
        isVariable: false,
        variants: (byFamily.get(f.family) || []).map((ff: any) => ({
          id: ff.id,
          familyId: `family_${f.canonical}`,
          filename: ff.filename,
          weight: ff.weight || 400,
          isItalic: /italic|oblique/i.test(ff.style || ''),
          styleName: ff.style || 'Regular',
          blobUrl: ff.blobUrl || ff.url,
          fileSize: ff.fileSize || 0,
          format: (ff.format || 'woff2').toString(),
          isVariable: Boolean(ff.isVariable),
          variableAxes: ff.variableAxes || [],
          openTypeFeatures: Array.isArray(ff.openTypeFeatures) ? ff.openTypeFeatures : [],
          fontMetrics: ff.fontMetrics,
          glyphCount: ff.glyphCount,
          uploadedAt: ff.uploadedAt || new Date().toISOString(),
          originalFilename: ff.originalFilename || ff.filename,
          isDefaultStyle: Boolean(ff.isDefaultStyle),
          published: true,
        })),
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    )

    return NextResponse.json({
      success: true,
      families,
      counts: {
        families: families.length,
        fonts: fonts.length,
      },
      cssBytes: css.length,
    })
  } catch (e) {
    console.error('preview-health error', e)
    return NextResponse.json({ success: false, error: 'health check failed' }, { status: 500 })
  }
}

