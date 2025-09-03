import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

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

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${file.name.replace(/\.[^/.]+$/, "")}_${timestamp}${path.extname(file.name)}`
    const filepath = path.join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    await fs.writeFile(filepath, Buffer.from(bytes))

    return NextResponse.json({ 
      success: true, 
      message: 'Font uploaded successfully',
      filename,
      path: `/fonts/uploads/${filename}`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}