/**
 * Blob-Only Storage Manager
 * 
 * Stores both font files AND metadata in Vercel Blob storage only.
 * No KV/Redis needed - everything goes into Blob.
 */

import { FontMetadata } from './font-parser'

// Environment check
const isVercelProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

// Dynamic imports for Vercel modules
let put: any, del: any, list: any

if (hasVercelBlob) {
  try {
    import('@vercel/blob').then(blob => {
      put = blob.put
      del = blob.del
      list = blob.list
    })
  } catch (error) {
    console.warn('⚠️ Vercel blob modules not available:', error)
  }
}

export class BlobOnlyStorageManager {
  private static instance: BlobOnlyStorageManager
  private memoryCache: FontMetadata[] = []
  private isInitialized = false
  private readonly METADATA_FILE = 'metadata/fonts.json'

  static getInstance(): BlobOnlyStorageManager {
    if (!BlobOnlyStorageManager.instance) {
      BlobOnlyStorageManager.instance = new BlobOnlyStorageManager()
    }
    return BlobOnlyStorageManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🔄 Initializing blob-only storage...')
    
    if (isVercelProduction && !hasVercelBlob) {
      console.error('🚨 CRITICAL: Production deployment without Blob storage!')
      console.error('📋 Missing environment variable: BLOB_READ_WRITE_TOKEN')
      console.error('🔧 Configure at: https://vercel.com/dashboard > Project > Storage')
    }

    // Load existing fonts
    await this.loadFontsFromBlob()
    this.isInitialized = true
    
    console.log(`✅ Storage initialized: ${this.getStorageType()}`)
  }

  getStorageType(): string {
    if (hasVercelBlob) return 'Vercel Blob (Persistent)'
    if (isVercelProduction) return 'Memory Only (TEMPORARY - WILL LOSE DATA)'
    return 'Local Development'
  }

  async storeFont(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    await this.initialize()

    if (hasVercelBlob && put) {
      return this.storeInVercelBlob(fontMetadata, fontBuffer)
    } else if (!isVercelProduction) {
      return this.storeLocally(fontMetadata, fontBuffer)
    } else {
      return this.storeInMemory(fontMetadata, fontBuffer)
    }
  }

  private async storeInVercelBlob(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    try {
      console.log(`☁️ Storing font in Vercel Blob: ${fontMetadata.family}`)
      
      // Upload font file to Blob
      const fontPath = `fonts/${fontMetadata.filename}`
      const blob = await put(fontPath, fontBuffer, {
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
        storage: 'vercel-blob'
      }

      // Update memory cache
      this.memoryCache = this.memoryCache.filter(f => f.filename !== fontMetadata.filename)
      this.memoryCache.push(enhancedMetadata)

      // Store metadata as JSON in Blob (instead of KV)
      await this.saveMetadataToBlob()

      console.log(`✅ Font stored in blob: ${fontMetadata.family} -> ${blob.url}`)
      return enhancedMetadata

    } catch (error) {
      console.error('❌ Vercel blob storage failed:', error)
      throw new Error(`Blob storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      url: null,
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

  private async saveMetadataToBlob(): Promise<void> {
    if (!hasVercelBlob || !put) return

    try {
      const metadataJson = JSON.stringify({
        fonts: this.memoryCache,
        lastUpdated: new Date().toISOString()
      })

      await put(this.METADATA_FILE, metadataJson, {
        access: 'public',
        contentType: 'application/json'
      })

      console.log('✅ Metadata saved to blob')
    } catch (error) {
      console.error('❌ Failed to save metadata to blob:', error)
    }
  }

  private async loadFontsFromBlob(): Promise<void> {
    if (hasVercelBlob && list) {
      try {
        // Try to load metadata JSON from blob
        const response = await fetch(`https://your-blob-store.com/${this.METADATA_FILE}`)
        if (response.ok) {
          const data = await response.json()
          this.memoryCache = data.fonts || []
          console.log(`✅ Loaded ${this.memoryCache.length} fonts from blob metadata`)
          return
        }
      } catch (error) {
        console.warn('⚠️ Could not load metadata from blob, starting fresh:', error)
      }
    }

    // Fallback to local loading in development
    if (!isVercelProduction) {
      await this.loadFontsFromLocal()
    }
  }

  private async loadFontsFromLocal(): Promise<void> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
      const data = await fs.readFile(dataFile, 'utf-8')
      const db = JSON.parse(data)
      this.memoryCache = db.fonts || []
      console.log(`✅ Loaded ${this.memoryCache.length} fonts from local storage`)
    } catch (error) {
      console.log('📝 No local fonts data found, starting fresh')
      this.memoryCache = []
    }
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    await this.initialize()
    return this.memoryCache
  }

  async removeFont(filename: string): Promise<boolean> {
    await this.initialize()

    let success = false

    // Remove from blob storage
    if (hasVercelBlob && del) {
      try {
        await del(`fonts/${filename}`)
        success = true
        console.log(`✅ Font file removed from blob: ${filename}`)
      } catch (error) {
        console.error('❌ Blob font removal failed:', error)
      }
    }

    // Remove from memory cache
    const initialLength = this.memoryCache.length
    this.memoryCache = this.memoryCache.filter(f => f.filename !== filename)
    if (this.memoryCache.length < initialLength) {
      success = true
      console.log(`✅ Font removed from metadata: ${filename}`)
    }

    // Update metadata
    if (hasVercelBlob) {
      await this.saveMetadataToBlob()
    } else if (!isVercelProduction) {
      await this.saveLocalMetadata()
    }

    return success
  }

  async updateFont(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    await this.initialize()

    const fontIndex = this.memoryCache.findIndex(f => f.filename === filename)
    if (fontIndex === -1) return false

    // Update memory cache
    this.memoryCache[fontIndex] = { ...this.memoryCache[fontIndex], ...updates }

    // Save metadata
    if (hasVercelBlob) {
      await this.saveMetadataToBlob()
    } else if (!isVercelProduction) {
      await this.saveLocalMetadata()
    }

    return true
  }

  private async saveLocalMetadata(): Promise<void> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      const dataFile = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
      await fs.writeFile(dataFile, JSON.stringify({
        fonts: this.memoryCache,
        lastUpdated: new Date().toISOString()
      }, null, 2))
    } catch (error) {
      console.warn('⚠️ Local metadata save failed:', error)
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
      hasVercelKV: false, // We're not using KV anymore
      isProduction: isVercelProduction,
      fontsCount: this.memoryCache.length
    }
  }
}

// Export singleton
export const blobOnlyStorage = BlobOnlyStorageManager.getInstance()