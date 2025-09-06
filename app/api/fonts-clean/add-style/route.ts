import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const familyName = formData.get('familyName') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!familyName) {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
    }

    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Add style to existing family
    const font = await fontStorageClean.addStyleToFamily(familyName, file)

    return NextResponse.json({ 
      success: true, 
      font,
      message: `Style added to ${familyName} family` 
    })

  } catch (error) {
    console.error('Add style error:', error)
    return NextResponse.json({ 
      error: 'Failed to add style to family',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}