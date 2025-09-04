import { NextRequest, NextResponse } from 'next/server'
import { parseFontFile } from '@/lib/font-parser'
import { persistentStorage } from '@/lib/persistent-storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const targetFamily = formData.get('targetFamily') as string | null || formData.get('familyName') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Basic file validation
    const allowedTypes = ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-otf', 'application/octet-stream']
    const hasValidExtension = file.name.match(/\.(ttf|otf)$/i)
    
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only TTF and OTF files allowed.',
        details: `Received type: ${file.type}, filename: ${file.name}`
      }, { status: 400 })
    }
    
    // File size check (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum file size is 10MB.',
        details: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 })
    }
    
    console.log(`📂 Uploading font: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`)
    if (targetFamily) {
      console.log(`🎯 Target family: ${targetFamily}`)
    }

    // Get file data
    const bytes = await file.arrayBuffer()
    
    // Parse font metadata
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    
    // If uploading to existing family, inherit family metadata
    if (targetFamily) {
      try {
        const existingFonts = await persistentStorage.getAllFonts()
        const familyFonts = existingFonts.filter(f => f.family === targetFamily)
        
        if (familyFonts.length > 0) {
          // Use the most recent font's family-level metadata
          const representativeFont = familyFonts.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          )[0]
          
          console.log(`🔄 Inheriting family metadata from: ${representativeFont.filename}`)
          
          // Override the parsed metadata with family-level settings
          fontMetadata.category = representativeFont.category
          fontMetadata.foundry = representativeFont.foundry
          fontMetadata.languages = representativeFont.languages
          fontMetadata.openTypeFeatures = [...new Set([
            ...fontMetadata.openTypeFeatures, 
            ...representativeFont.openTypeFeatures
          ])]
          fontMetadata.price = representativeFont.price
          
          // Force the family name to match the target
          fontMetadata.family = targetFamily
          fontMetadata.name = targetFamily
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load existing family metadata: ${error}`)
      }
    }
    
    // Store font using persistent storage manager
    const storedFont = await persistentStorage.storeFont(fontMetadata, bytes)
    
    // Log storage type for debugging
    const storageInfo = persistentStorage.getStorageInfo()
    console.log(`📊 Storage used: ${storageInfo.type} (${storageInfo.fontsCount} total fonts)`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Font uploaded successfully${targetFamily ? ` to ${targetFamily} family` : ''}`,
      font: storedFont,
      inheritedMetadata: targetFamily ? true : false
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    console.error('📁 Request details:', {
      fileName: file?.name || 'No file',
      fileSize: file?.size || 0,
      fileType: file?.type || 'Unknown'
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Font upload failed', 
      details: errorMessage,
      troubleshooting: {
        supportedFormats: ['TTF', 'OTF'],
        maxFileSize: '10MB',
        commonIssues: [
          'File might be corrupted',
          'Font format not supported by OpenType.js',
          'File is not a valid font file'
        ]
      }
    }, { status: 500 })
  }
}