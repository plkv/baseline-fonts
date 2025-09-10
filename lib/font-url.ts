export function resolveFontUrl(font: any): string | null {
  // Normalize to a single absolute URL for font file
  const candidates = [
    font?.blobUrl,
    font?.url, // some APIs expose url field
    font?.blob, // legacy field observed in production
  ]
  const pick = candidates.find((u) => typeof u === 'string' && u.length > 0)
  if (!pick) return null
  // Ensure it's absolute; if relative, return null (we do not guess path here)
  try {
    // eslint-disable-next-line no-new
    new URL(pick)
    return pick
  } catch {
    return null
  }
}

