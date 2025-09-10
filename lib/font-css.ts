import type { FontFamily } from '@/lib/models/FontFamily'
import { FontVariantUtils } from '@/lib/models/FontVariant'

export function buildFontCSS(families: FontFamily[]): string {
  const chunks: string[] = []
  for (const fam of families) {
    for (const v of fam.variants) {
      chunks.push(FontVariantUtils.toCSSFontFace(v, fam.name))
    }
  }
  return chunks.join('\n')
}

