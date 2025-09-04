/**
 * Persistent Storage Manager
 * 
 * Ensures fonts persist across deployments by managing Vercel Blob + KV storage
 * with robust fallback mechanisms.
 */

import { FontMetadata } from './font-parser'

const KV_FONTS_KEY = 'fonts:metadata'
const STORAGE_HEALTH_KEY = 'storage:health'

// Environment check
const isVercelProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
const hasVercelKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

// Dynamic imports for Vercel modules
let put: any, del: any, kv: any

if (hasVercelBlob || hasVercelKV) {
  try {
    import('@vercel/blob').then(blob => {
      put = blob.put
      del = blob.del
    })
    import('@vercel/kv').then(kvModule => {
      kv = kvModule.kv
    })
  } catch (error) {
    console.warn('⚠️ Vercel storage modules not available:', error)
  }
}

export class PersistentStorageManager {
  private static instance: PersistentStorageManager
  private memoryCache: FontMetadata[] = []
  private isInitialized = false

  static getInstance(): PersistentStorageManager {
    if (!PersistentStorageManager.instance) {
      PersistentStorageManager.instance = new PersistentStorageManager()
    }
    return PersistentStorageManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🔄 Initializing persistent storage...')
    
    if (isVercelProduction && (!hasVercelBlob || !hasVercelKV)) {
      console.error('🚨 CRITICAL: Production deployment without persistent storage!')
      console.error('📋 Missing environment variables:')
      if (!hasVercelBlob) console.error('   - BLOB_READ_WRITE_TOKEN')
      if (!hasVercelKV) console.error('   - KV_REST_API_URL, KV_REST_API_TOKEN')
      console.error('🔧 Configure these in Vercel dashboard > Project > Settings > Environment Variables')
      
      // Store health check failure
      await this.storeHealthStatus('STORAGE_MISCONFIGURED', {
        timestamp: new Date().toISOString(),
        environment: 'production',
        hasBlob: hasVercelBlob,
        hasKV: hasVercelKV,
        error: 'Missing required environment variables for persistent storage'
      })
    }

    // Load existing fonts
    await this.loadFonts()
    this.isInitialized = true
    
    console.log(`✅ Storage initialized: ${this.getStorageType()}`)
  }

  getStorageType(): string {
    if (hasVercelBlob && hasVercelKV) return 'Vercel Cloud (Persistent)'
    if (isVercelProduction) return 'Memory Only (TEMPORARY - WILL LOSE DATA)'
    return 'Local Development'
  }

  async storeFont(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    await this.initialize()

    if (hasVercelBlob && hasVercelKV && put && kv) {
      return this.storeInVercelCloud(fontMetadata, fontBuffer)
    } else if (!isVercelProduction) {
      return this.storeLocally(fontMetadata, fontBuffer)
    } else {
      return this.storeInMemory(fontMetadata, fontBuffer)
    }
  }

  private async storeInVercelCloud(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    try {
      console.log(`☁️ Storing font in Vercel Cloud: ${fontMetadata.family}`)
      
      // Upload to Vercel Blob
      const blobPath = `fonts/${fontMetadata.filename}`
      const blob = await put(blobPath, fontBuffer, {
        access: 'public',
        contentType: this.getContentType(fontMetadata.format)
      })

      // Enhanced metadata
      const enhancedMetadata: FontMetadata = {
        ...fontMetadata,
        url: blob.url,
        path: `/fonts/${fontMetadata.filename}`,
        uploadedAt: new Date().toISOString(),
        published: fontMetadata.published ?? true,
        storage: 'vercel-cloud'
      }

      // Store metadata in KV
      const existingFonts = await this.getAllFonts()
      const updatedFonts = existingFonts.filter(f => f.filename !== fontMetadata.filename)
      updatedFonts.push(enhancedMetadata)

      await kv.set(KV_FONTS_KEY, updatedFonts)
      this.memoryCache = updatedFonts

      console.log(`✅ Font stored in cloud: ${fontMetadata.family} -> ${blob.url}`)
      return enhancedMetadata

    } catch (error) {
      console.error('❌ Vercel cloud storage failed:', error)
      throw new Error(`Cloud storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async storeLocally(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    try {
      const fs = require('fs').promises
      const path = require('path')

      // Save to public/fonts/
      const fontsDir = path.join(process.cwd(), 'public', 'fonts')
      await fs.mkdir(fontsDir, { recursive: true })

      const fontPath = path.join(fontsDir, fontMetadata.filename)
      await fs.writeFile(fontPath, new Uint8Array(fontBuffer))

      const enhancedMetadata: FontMetadata = {
        ...fontMetadata,
        url: `/fonts/${fontMetadata.filename}`,
        path: `/fonts/${fontMetadata.filename}`,
        uploadedAt: new Date().toISOString(),
        published: fontMetadata.published ?? true,
        storage: 'local-dev'
      }

      // Update memory cache and JSON file
      this.memoryCache = this.memoryCache.filter(f => f.filename !== fontMetadata.filename)
      this.memoryCache.push(enhancedMetadata)

      const dataFile = path.join(fontsDir, 'fonts-data.json')
      await fs.writeFile(dataFile, JSON.stringify({
        fonts: this.memoryCache,
        lastUpdated: new Date().toISOString()
      }, null, 2))

      console.log(`✅ Font stored locally: ${fontMetadata.family}`)
      return enhancedMetadata

    } catch (error) {
      console.error('❌ Local storage failed:', error)
      throw new Error(`Local storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async storeInMemory(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    console.warn('⚠️ Storing font in memory only - WILL BE LOST ON RESTART!')
    
    const enhancedMetadata: FontMetadata = {
      ...fontMetadata,
      url: null, // No URL available
      path: `/fonts/${fontMetadata.filename}`,
      uploadedAt: new Date().toISOString(),
      published: fontMetadata.published ?? true,
      storage: 'memory-only',
      warning: 'Font stored in memory only - will be lost on deployment'
    }

    this.memoryCache = this.memoryCache.filter(f => f.filename !== fontMetadata.filename)
    this.memoryCache.push(enhancedMetadata)

    console.log(`⚠️ Font stored in memory: ${fontMetadata.family} (TEMPORARY)`)
    return enhancedMetadata
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    await this.initialize()

    if (hasVercelKV && kv) {
      try {
        const fonts = await kv.get<FontMetadata[]>(KV_FONTS_KEY)
        if (fonts) {
          this.memoryCache = fonts
          return fonts
        }
      } catch (error) {
        console.warn('⚠️ KV retrieval failed, using fallback:', error)
      }
    }

    // Fallback to local or memory
    return this.loadFontsFromFallback()
  }

  private async loadFonts(): Promise<void> {
    if (hasVercelKV && kv) {
      try {
        const fonts = await kv.get<FontMetadata[]>(KV_FONTS_KEY)
        if (fonts) {
          this.memoryCache = fonts
          return
        }
      } catch (error) {
        console.warn('⚠️ Initial font load from KV failed:', error)
      }
    }

    // Fallback loading
    this.memoryCache = await this.loadFontsFromFallback()
  }

  private async loadFontsFromFallback(): Promise<FontMetadata[]> {
    if (!isVercelProduction) {
      try {
        const fs = require('fs').promises
        const path = require('path')
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        const data = await fs.readFile(dataFile, 'utf-8')
        const db = JSON.parse(data)
        return db.fonts || []
      } catch (error) {
        console.log('📝 No local fonts data found, starting fresh')
        return []
      }
    }

    return this.memoryCache
  }

  async removeFont(filename: string): Promise<boolean> {
    await this.initialize()

    let success = false

    // Remove from cloud storage
    if (hasVercelBlob && hasVercelKV && del && kv) {
      try {
        await del(`fonts/${filename}`)
        
        const existingFonts = await this.getAllFonts()
        const updatedFonts = existingFonts.filter(f => f.filename !== filename)
        await kv.set(KV_FONTS_KEY, updatedFonts)
        
        this.memoryCache = updatedFonts
        success = true
        console.log(`✅ Font removed from cloud: ${filename}`)
      } catch (error) {
        console.error('❌ Cloud font removal failed:', error)
      }
    }

    // Remove from local storage (dev)
    if (!isVercelProduction) {
      try {
        const fs = require('fs').promises
        const path = require('path')
        
        const fontPath = path.join(process.cwd(), 'public', 'fonts', filename)
        await fs.unlink(fontPath)
        
        this.memoryCache = this.memoryCache.filter(f => f.filename !== filename)
        
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        await fs.writeFile(dataFile, JSON.stringify({
          fonts: this.memoryCache,
          lastUpdated: new Date().toISOString()
        }, null, 2))
        
        success = true
        console.log(`✅ Font removed locally: ${filename}`)
      } catch (error) {
        console.warn('⚠️ Local font removal failed:', error)
      }
    }

    // Remove from memory cache as fallback
    const initialLength = this.memoryCache.length
    this.memoryCache = this.memoryCache.filter(f => f.filename !== filename)
    if (this.memoryCache.length < initialLength) {
      success = true
      console.log(`✅ Font removed from memory: ${filename}`)
    }

    return success
  }

  async updateFont(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    await this.initialize()

    if (hasVercelKV && kv) {
      try {
        const existingFonts = await this.getAllFonts()
        const updatedFonts = existingFonts.map(font => 
          font.filename === filename ? { ...font, ...updates } : font
        )
        await kv.set(KV_FONTS_KEY, updatedFonts)
        this.memoryCache = updatedFonts
        return true
      } catch (error) {
        console.error('❌ Font update failed:', error)
      }
    }

    // Fallback update
    this.memoryCache = this.memoryCache.map(font => 
      font.filename === filename ? { ...font, ...updates } : font
    )

    // Update local file if in development
    if (!isVercelProduction) {
      try {
        const fs = require('fs').promises
        const path = require('path')
        const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
        await fs.writeFile(dataFile, JSON.stringify({
          fonts: this.memoryCache,
          lastUpdated: new Date().toISOString()
        }, null, 2))
      } catch (error) {
        console.warn('⚠️ Local update failed:', error)
      }
    }

    return true
  }

  private async storeHealthStatus(status: string, details: any): Promise<void> {
    if (hasVercelKV && kv) {
      try {
        await kv.set(STORAGE_HEALTH_KEY, { status, ...details })
      } catch (error) {
        console.warn('⚠️ Health status storage failed:', error)
      }
    }
  }

  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'ttf': return 'font/ttf'
      case 'otf': return 'font/otf'  
      case 'woff': return 'font/woff'
      case 'woff2': return 'font/woff2'
      default: return 'application/octet-stream'
    }
  }

  getStorageInfo() {
    return {
      type: this.getStorageType(),
      hasVercelBlob,
      hasVercelKV,
      isProduction: isVercelProduction,
      fontsCount: this.memoryCache.length
    }
  }
}

// Export singleton
export const persistentStorage = PersistentStorageManager.getInstance()