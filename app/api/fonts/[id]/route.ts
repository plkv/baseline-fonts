/**
 * Individual Font API - Single font operations
 * GET /api/fonts/[id] - Get specific font
 * PATCH /api/fonts/[id] - Update font metadata  
 * DELETE /api/fonts/[id] - Delete font
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-storage'

// GET /api/fonts/[id] - Get specific font
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const font = await fontStorage.getFont(params.id)
    
    if (!font) {
      return NextResponse.json(
        { success: false, error: 'Font not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      font
    })
    
  } catch (error) {
    console.error(`GET /api/fonts/${params.id} error:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch font',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PATCH /api/fonts/[id] - Update font metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    // Validate updates - only allow safe fields to be updated
    const allowedFields = [
      'name', 'collection', 'tags', 'category', 'published', 
      'downloadUrl', 'designer', 'foundry', 'version', 'license'
    ]
    
    const safeUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)
    
    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' }, 
        { status: 400 }
      )
    }
    
    const updatedFont = await fontStorage.updateFont(params.id, safeUpdates)
    
    if (!updatedFont) {
      return NextResponse.json(
        { success: false, error: 'Font not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      font: updatedFont,
      message: 'Font updated successfully'
    })
    
  } catch (error) {
    console.error(`PATCH /api/fonts/${params.id} error:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// DELETE /api/fonts/[id] - Delete font
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await fontStorage.deleteFont(params.id)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Font not found or deletion failed' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Font deleted successfully'
    })
    
  } catch (error) {
    console.error(`DELETE /api/fonts/${params.id} error:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}