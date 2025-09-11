import type { FontFamily } from '@/lib/models/FontFamily'
import { FontVariantUtils } from '@/lib/models/FontVariant'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

function escapeCssString(input: string): string {
  return input.replace(/"/g, '\\"')
}

function toProxyUrl(url: string): string {
  const encoded = Buffer.from(url).toString('base64url')
  return `/api/font-file?u=${encoded}`
}

export function buildFontCSS(families: FontFamily[]): string {
  const chunks: string[] = []
  for (const fam of families) {
    const canonical = canonicalFamilyName(fam.name)
    const alias = `${canonical}-${shortHash(canonical).slice(0,6)}`
    const familyName = escapeCssString(alias)
    for (const v of fam.variants) {
      if (!v.blobUrl) continue
      const proxied = { ...v, blobUrl: toProxyUrl(v.blobUrl) }
      chunks.push(`/* ${familyName} :: ${v.styleName} ${v.weight}${v.isItalic ? ' Italic' : ''} */`)
      // Primary proxied source
      chunks.push(FontVariantUtils.toCSSFontFace(proxied, familyName))
      // Fallback direct source if proxy fails (some environments block HEAD/stream)
      chunks.push(FontVariantUtils.toCSSFontFace(v, familyName))
    }
  }
  return chunks.join('\n')
}
