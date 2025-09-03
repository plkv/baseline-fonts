import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parseFontFile } from '@/lib/font-parser'
import { fontStorage } from '@/lib/font-database'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Basic file validation
    const allowedTypes = ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-otf']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(ttf|otf)$/i)) {
      return NextResponse.json({ error: 'Invalid file type. Only TTF and OTF files allowed.' }, { status: 400 })
    }

    // Get file data
    const bytes = await file.arrayBuffer()
    
    // Parse font metadata
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    
    // Try to save the font file to public/fonts/ directory
    const fontUrl = await fontStorage.saveFontFile(bytes, file.name)
    if (fontUrl) {
      fontMetadata.url = fontUrl // Add download URL to metadata
    }
    
    // Store in database
    await fontStorage.addFont(fontMetadata)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Font parsed and added to catalog successfully',
      font: fontMetadata,
      note: 'Font metadata stored. File download will be added in future update.'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Font parsing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}