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

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'fonts', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    // Get file data
    const bytes = await file.arrayBuffer()
    
    // Parse font metadata
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${file.name.replace(/\.[^/.]+$/, "")}_${timestamp}${path.extname(file.name)}`
    const filepath = path.join(uploadDir, filename)

    // Update metadata with actual filename
    fontMetadata.filename = filename
    fontMetadata.path = `/fonts/uploads/${filename}`

    // Save file
    await fs.writeFile(filepath, Buffer.from(bytes))
    
    // Store in database
    await fontStorage.addFont(fontMetadata)

    return NextResponse.json({ 
      success: true, 
      message: 'Font uploaded successfully',
      font: fontMetadata
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}