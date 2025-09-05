/**
 * Font Upload V2 - Bulletproof Implementation
 * 
 * DESIGN PRINCIPLES:
 * 1. Comprehensive error handling
 * 2. Clear error messages
 * 3. No complex logic or edge cases
 * 4. Graceful degradation
 * 5. Proper logging for diagnostics
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseFontFile } from '@/lib/font-parser'
import { fontStorageV2 } from '@/lib/font-storage-v2'
import { kv } from '@vercel/kv'

interface UploadError {
  code: string
  message: string
  details?: any
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 Font upload V2 started')
  
  try {
    // STEP 1: Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('✅ Form data parsed')
    } catch (error) {
      throw {
        code: 'FORM_PARSE_ERROR',
        message: 'Failed to parse form data',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 2: Validate file
    const file = formData.get('file') as File
    if (!file) {
      throw {
        code: 'NO_FILE',
        message: 'No file provided in request'
      } as UploadError
    }

    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      throw {
        code: 'INVALID_FORMAT',
        message: 'Invalid file format. Only TTF, OTF, WOFF, WOFF2 allowed',
        details: { filename: file.name, type: file.type }
      } as UploadError
    }

    if (file.size > 10 * 1024 * 1024) {
      throw {
        code: 'FILE_TOO_LARGE',
        message: 'File too large. Maximum 10MB allowed',
        details: { size: file.size, maxSize: 10 * 1024 * 1024 }
      } as UploadError
    }

    if (file.size < 1000) {
      throw {
        code: 'FILE_TOO_SMALL',
        message: 'File too small to be a valid font',
        details: { size: file.size }
      } as UploadError
    }

    console.log(`📁 File validated: ${file.name} (${Math.round(file.size / 1024)}KB)`)

    // STEP 3: Read file data
    let fileBuffer: ArrayBuffer
    try {
      fileBuffer = await file.arrayBuffer()
      if (!fileBuffer || fileBuffer.byteLength === 0) {
        throw new Error('Empty file buffer')
      }
      console.log('✅ File data loaded')
    } catch (error) {
      throw {
        code: 'FILE_READ_ERROR',
        message: 'Failed to read file data',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 4: Parse font metadata
    let fontMetadata
    try {
      fontMetadata = await parseFontFile(fileBuffer, file.name, file.size)
      console.log(`🔍 Font parsed: ${fontMetadata.family} (${fontMetadata.style}, ${fontMetadata.weight})`)
    } catch (error) {
      throw {
        code: 'FONT_PARSE_ERROR',
        message: 'Failed to parse font file',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 4.5: Handle family inheritance and prevent duplicates
    const targetFamily = formData.get('familyName') as string | null
    if (targetFamily) {
      try {
        const existingFonts = await fontStorageV2.getAllFonts()
        const familyFonts = existingFonts.filter(f => f.family === targetFamily)
        
        if (familyFonts.length > 0) {
          console.log(`🔄 Adding to existing family: ${targetFamily}`)
          
          // Use the most recent font's family-level metadata
          const representativeFont = familyFonts.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          )[0]
          
          // Only copy family-level settings, preserve individual font properties
          const originalStyle = fontMetadata.style
          const originalWeight = fontMetadata.weight
          const originalName = fontMetadata.name
          
          // Copy family-level metadata
          fontMetadata.category = representativeFont.category
          fontMetadata.foundry = representativeFont.foundry
          fontMetadata.languages = representativeFont.languages
          fontMetadata.openTypeFeatures = [...new Set([
            ...fontMetadata.openTypeFeatures, 
            ...representativeFont.openTypeFeatures
          ])]
          fontMetadata.price = representativeFont.price || 'Free'
          fontMetadata.downloadLink = representativeFont.downloadLink
          
          // Force the family name to match the target but preserve individual font properties
          fontMetadata.family = targetFamily
          fontMetadata.style = originalStyle  // Keep original style
          fontMetadata.weight = originalWeight  // Keep original weight
          fontMetadata.name = originalName  // Keep original font name
          
          console.log(`✅ Inherited family metadata from: ${representativeFont.filename}`)
          console.log(`🔍 Preserved individual properties: style=${originalStyle}, weight=${originalWeight}, name=${originalName}`)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load existing family metadata: ${error}`)
      }
    }

    // Check for duplicate uploads (same filename in same family)
    try {
      const existingFonts = await fontStorageV2.getAllFonts()
      const duplicate = existingFonts.find(f => 
        f.filename === file.name && f.family === fontMetadata.family
      )
      
      if (duplicate) {
        throw {
          code: 'DUPLICATE_FONT',
          message: `Font "${file.name}" already exists in family "${fontMetadata.family}"`,
          details: { filename: file.name, family: fontMetadata.family }
        } as UploadError
      }
    } catch (error) {
      if ((error as any).code === 'DUPLICATE_FONT') {
        throw error
      }
      console.warn('⚠️ Could not check for duplicates:', error)
    }

    // STEP 5: Store font
    let storedFont
    try {
      storedFont = await fontStorageV2.storeFont(fontMetadata, fileBuffer)
      console.log('✅ Font stored successfully')
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to store font',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 5.5: Also store metadata in Redis for easy updates (if available)
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    
    if (hasUpstash || hasKV) {
      try {
        let redis
        if (hasUpstash) {
          console.log('📤 Storing in Upstash Redis')
          const { Redis } = await import('@upstash/redis')
          redis = Redis.fromEnv()
        } else {
          console.log('📤 Storing in legacy Vercel KV')
          redis = kv // Already imported at top
        }
        
        await redis.hset('fonts', { [storedFont.filename]: storedFont })
        console.log('✅ Font metadata stored in Redis:', storedFont.filename)
      } catch (error) {
        console.warn('⚠️ Failed to store in Redis (non-critical):', error)
        // Don't fail the upload if Redis storage fails
      }
    } else {
      console.log('ℹ️ Redis not available, skipping Redis storage')
    }

    // STEP 6: Success response
    const duration = Date.now() - startTime
    console.log(`🎉 Font upload completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Font "${fontMetadata.family}" uploaded successfully`,
      font: storedFont,
      performance: {
        uploadTime: duration,
        fileSize: file.size
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Font upload failed:', error)

    // Handle custom upload errors
    if (error && typeof error === 'object' && 'code' in error) {
      const uploadError = error as UploadError
      return NextResponse.json({
        success: false,
        error: uploadError.code,
        message: uploadError.message,
        details: uploadError.details,
        timestamp: new Date().toISOString(),
        performance: {
          failureTime: duration
        }
      }, { status: 400 })
    }

    // Handle unexpected errors
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred during upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      performance: {
        failureTime: duration
      }
    }, { status: 500 })
  }
}