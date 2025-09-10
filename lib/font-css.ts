import type { FontFamily } from '@/lib/models/FontFamily'
import { FontVariantUtils } from '@/lib/models/FontVariant'

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
    const familyName = escapeCssString(fam.name)
    for (const v of fam.variants) {
      const proxied = { ...v, blobUrl: toProxyUrl(v.blobUrl) }
      chunks.push(FontVariantUtils.toCSSFontFace(proxied, familyName))
    }
  }
  return chunks.join('\n')
}
