import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

// GET /api/families-v2/[id] - Get single family
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const family = await fontStorageClean.getFamily(params.id)

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      family
    })
  } catch (error) {
    console.error('Get family error:', error)
    return NextResponse.json(
      { error: 'Failed to get family', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH /api/families-v2/[id] - Update family metadata
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { updates } = body

    if (!updates) {
      return NextResponse.json({ error: 'Updates are required' }, { status: 400 })
    }

    const success = await fontStorageClean.updateFamily(params.id, updates)

    if (!success) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Family updated successfully'
    })
  } catch (error) {
    console.error('Update family error:', error)
    return NextResponse.json(
      { error: 'Failed to update family', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/families-v2/[id] - Delete family and all variants
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = await fontStorageClean.deleteFamily(params.id)

    if (!success) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Family deleted successfully'
    })
  } catch (error) {
    console.error('Delete family error:', error)
    return NextResponse.json(
      { error: 'Failed to delete family', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}