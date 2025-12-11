import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Use Node.js runtime for KV operations
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLLECTIONS = ['Text', 'Display', 'Weirdo'] as const
const TYPES = ['appearance', 'category'] as const

interface MigrationResult {
  type: string
  beforeCounts: Record<string, number>
  afterCount: number
  mergedTags: string[]
}

export async function POST() {
  try {
    const results: MigrationResult[] = []

    // Step 1: Backup old vocabularies
    console.log('Creating backup of old vocabularies...')
    for (const type of TYPES) {
      for (const collection of COLLECTIONS) {
        const oldKey = `tags:vocab:${type}:${collection}`
        const backupKey = `tags:vocab:backup:${type}:${collection}`
        const tags = await kv.get<string[]>(oldKey)
        if (tags) {
          await kv.set(backupKey, tags)
        }
      }
    }

    // Step 2: Merge vocabularies
    for (const type of TYPES) {
      const allTags = new Set<string>()
      const beforeCounts: Record<string, number> = {}

      // Read from old collection-based keys
      for (const collection of COLLECTIONS) {
        const oldKey = `tags:vocab:${type}:${collection}`
        const tags = await kv.get<string[]>(oldKey)

        if (Array.isArray(tags)) {
          beforeCounts[collection] = tags.length
          tags.forEach(tag => allTags.add(tag))
        } else {
          beforeCounts[collection] = 0
        }
      }

      // Convert to array and sort alphabetically
      const mergedTags = Array.from(allTags).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      )

      // Save to new unified key
      const newKey = `tags:vocab:${type}`
      await kv.set(newKey, mergedTags)

      results.push({
        type,
        beforeCounts,
        afterCount: mergedTags.length,
        mergedTags
      })
    }

    // Step 3: Verify
    for (const type of TYPES) {
      const newKey = `tags:vocab:${type}`
      const unified = await kv.get<string[]>(newKey)

      if (!Array.isArray(unified) || unified.length === 0) {
        return NextResponse.json({
          success: false,
          error: `${newKey} is empty or invalid after migration!`
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      results,
      summary: results.map(r => ({
        type: r.type,
        before: r.beforeCounts,
        after: r.afterCount,
        samples: r.mergedTags.slice(0, 10)
      }))
    })

  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Allow GET for easy browser access
export async function GET() {
  return NextResponse.json({
    message: 'Tag vocabulary migration endpoint',
    instructions: 'Send POST request to run migration',
    endpoint: '/api/migrate-tags',
    method: 'POST'
  })
}
