export function canonicalFamilyName(name: string): string {
  try {
    return name
      .normalize('NFKC')
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return (name || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim()
  }
}

