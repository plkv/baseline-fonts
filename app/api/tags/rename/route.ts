import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { oldTag, newTag, type } = await req.json()

    if (!oldTag || !newTag || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: oldTag, newTag, type'
      }, { status: 400 })
    }

    if (type !== 'appearance' && type !== 'category') {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "appearance" or "category"'
      }, { status: 400 })
    }

    const normalizedOld = toTitleCase(oldTag.trim())
    const normalizedNew = toTitleCase(newTag.trim())

    if (normalizedOld === normalizedNew) {
      return NextResponse.json({
        success: false,
        error: 'Old and new tags are the same'
      }, { status: 400 })
    }

    // Get all fonts
    const all = await fontStorageClean.getAllFonts()
    let updatedCount = 0
    let fontsAffected = 0

    // Update fonts with the renamed tag (case-insensitive)
    for (const f of all as any[]) {
      let wasUpdated = false

      if (type === 'appearance') {
        const curr: string[] = Array.isArray(f.styleTags) ? f.styleTags : []

        // Check if old tag exists (case-insensitive)
        const hasOldTag = curr.some(t => toTitleCase(t.trim()).toLowerCase() === normalizedOld.toLowerCase())

        if (hasOldTag) {
          // Replace old tag with new tag, normalize all tags to TitleCase
          const updated = curr.map(t => {
            const normalized = toTitleCase(t.trim())
            return normalized.toLowerCase() === normalizedOld.toLowerCase() ? normalizedNew : normalized
          })

          // Remove duplicates (case-insensitive, keep TitleCase)
          const seen = new Set<string>()
          const unique = updated.filter(tag => {
            const lower = tag.toLowerCase()
            if (seen.has(lower)) return false
            seen.add(lower)
            return true
          })

          await fontStorageClean.updateFont(f.id, { styleTags: unique })
          wasUpdated = true
          updatedCount++
        }
      } else if (type === 'category') {
        const curr: string[] = Array.isArray(f.category) ? f.category : []

        // Check if old tag exists (case-insensitive)
        const hasOldTag = curr.some(t => toTitleCase(t.trim()).toLowerCase() === normalizedOld.toLowerCase())

        if (hasOldTag) {
          // Replace old tag with new tag, normalize all tags to TitleCase
          const updated = curr.map(t => {
            const normalized = toTitleCase(t.trim())
            return normalized.toLowerCase() === normalizedOld.toLowerCase() ? normalizedNew : normalized
          })

          // Remove duplicates (case-insensitive, keep TitleCase)
          const seen = new Set<string>()
          const unique = updated.filter(tag => {
            const lower = tag.toLowerCase()
            if (seen.has(lower)) return false
            seen.add(lower)
            return true
          })

          await fontStorageClean.updateFont(f.id, { category: unique })
          wasUpdated = true
          updatedCount++
        }
      }

      if (wasUpdated) fontsAffected++
    }

    // Update vocabulary: remove old tag, ensure new tag exists
    const vocabKey = `tags:vocab:${type}`
    const vocab: string[] = (await kv.get<string[]>(vocabKey)) || []

    // Remove old tag from vocab
    const withoutOld = vocab.filter(t => toTitleCase(t) !== normalizedOld)

    // Add new tag if not already present
    if (!withoutOld.some(t => toTitleCase(t) === normalizedNew)) {
      withoutOld.push(normalizedNew)
    }

    // Sort alphabetically
    const sorted = withoutOld.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    // Save updated vocabulary
    await kv.set(vocabKey, sorted)

    return NextResponse.json({
      success: true,
      message: `Renamed "${normalizedOld}" to "${normalizedNew}"`,
      updatedCount,
      fontsAffected,
      vocabularyUpdated: true
    })

  } catch (error) {
    console.error('Tag rename failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Allow GET for API info
export async function GET() {
  return NextResponse.json({
    message: 'Tag rename endpoint',
    usage: 'POST with { oldTag, newTag, type }',
    example: {
      oldTag: 'Sans Serif',
      newTag: 'Sans',
      type: 'appearance'
    }
  })
}
