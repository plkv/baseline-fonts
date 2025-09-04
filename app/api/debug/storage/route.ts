import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Storage diagnostic request')
  
  try {
    const { blobOnlyStorage } = await import('@/lib/blob-only-storage')
    
    // Environment variables check
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? '✅ SET' : '❌ MISSING'
    }
    
    // Storage info
    await blobOnlyStorage.initialize()
    const storageInfo = blobOnlyStorage.getStorageInfo()
    const allFonts = await blobOnlyStorage.getAllFonts()
    
    // Blob module check
    let blobModuleStatus = '❌ Not loaded'
    try {
      const blobModule = await import('@vercel/blob')
      blobModuleStatus = '✅ Available'
    } catch (error) {
      blobModuleStatus = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: envVars,
      storage: storageInfo,
      blobModule: blobModuleStatus,
      fontsCount: allFonts.length,
      fonts: allFonts.map(f => ({
        filename: f.filename,
        family: f.family,
        storage: f.storage || 'unknown',
        uploadedAt: f.uploadedAt
      }))
    }
    
    console.log('📊 Storage diagnostic:', JSON.stringify(diagnostic, null, 2))
    
    return NextResponse.json(diagnostic)

  } catch (error) {
    console.error('❌ Storage diagnostic error:', error)
    
    return NextResponse.json({ 
      error: 'Storage diagnostic failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}