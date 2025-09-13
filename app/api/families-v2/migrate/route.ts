import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

// POST /api/families-v2/migrate - Migrate from file-first to family-first structure
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting migration from file-first to family-first structure...')

    const result = await fontStorageClean.migrateToFamilyFirst()

    console.log(`✅ Migration complete: ${result.families} families, ${result.variants} variants`)

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully migrated ${result.families} families with ${result.variants} variants`
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}