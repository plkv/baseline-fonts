import { NextResponse } from 'next/server'
import { persistentStorage } from '@/lib/persistent-storage'

export async function GET() {
  try {
    const storageInfo = persistentStorage.getStorageInfo()
    
    const status = {
      ...storageInfo,
      environment: process.env.NODE_ENV,
      isVercelEnvironment: !!process.env.VERCEL,
      timestamp: new Date().toISOString(),
      recommendations: []
    }

    // Add recommendations based on current setup
    if (status.isProduction && (!status.hasVercelBlob || !status.hasVercelKV)) {
      status.recommendations.push('⚠️ URGENT: Configure Vercel Blob and KV storage to prevent data loss on deployments')
      status.recommendations.push('📋 Required environment variables: BLOB_READ_WRITE_TOKEN, KV_REST_API_URL, KV_REST_API_TOKEN')
      status.recommendations.push('🔧 Configure at: https://vercel.com/dashboard > Project > Storage')
    }

    if (status.type.includes('Memory Only')) {
      status.recommendations.push('💾 Fonts are stored in memory only - they will be lost on next deployment')
      status.recommendations.push('🛠️ Set up persistent storage to fix this issue')
    }

    if (status.type.includes('Persistent')) {
      status.recommendations.push('✅ Storage is properly configured for production')
      status.recommendations.push('🎉 Fonts will persist across deployments')
    }

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get storage status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}