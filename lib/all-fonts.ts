import { fontStorageClean } from '@/lib/font-storage-clean'

export async function getAllKnownFonts(): Promise<any[]> {
  const results: any[] = []
  try {
    const clean = await fontStorageClean.getAllFonts()
    results.push(...clean)
  } catch {}
  try {
    // Legacy V2 storage
    const { fontStorageV2 } = await import('@/lib/font-storage-v2')
    const legacy = await fontStorageV2.getAllFonts()
    results.push(...legacy)
  } catch {}
  // De-duplicate by filename if present, else by id
  const byKey = new Map<string, any>()
  for (const f of results) {
    const key = (f as any).filename || (f as any).id || Math.random().toString(36)
    if (!byKey.has(key)) byKey.set(key, f)
  }
  return Array.from(byKey.values())
}

