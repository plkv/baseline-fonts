/**
 * Font Storage V2 - Bulletproof Architecture
 * 
 * DESIGN PRINCIPLES:
 * 1. Simple, predictable behavior
 * 2. Individual font files as metadata (no single-file race conditions)
 * 3. Graceful degradation
 * 4. Comprehensive error handling
 * 5. No dynamic imports or complex initialization
 */

import { put, list, del } from '@vercel/blob'
import { FontMetadata } from './font-parser'

const STORAGE_PREFIX = 'font-catalog/'

export class FontStorageV2 {
  private static instance: FontStorageV2
  private isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
  private hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN

  static getInstance(): FontStorageV2 {
    if (!FontStorageV2.instance) {
      FontStorageV2.instance = new FontStorageV2()
    }
    return FontStorageV2.instance
  }

  /**
   * Store font with bulletproof error handling
   */
  async storeFont(metadata: FontMetadata, buffer: ArrayBuffer): Promise<FontMetadata> {
    console.log(`📤 Storing font: ${metadata.family} (${metadata.filename})`)
    
    try {
      if (this.hasBlob && this.isProduction) {
        return await this.storeFontInBlob(metadata, buffer)
      } else {
        return await this.storeFontLocally(metadata, buffer)
      }
    } catch (error) {
      console.error('❌ Font storage failed:', error)
      
      // Graceful fallback to local storage in production if blob fails
      if (this.isProduction) {
        console.warn('⚠️ Falling back to local storage')
        return await this.storeFontLocally(metadata, buffer)
      }
      
      throw error
    }
  }

  /**
   * Store font in Vercel Blob with individual metadata files
   */
  private async storeFontInBlob(metadata: FontMetadata, buffer: ArrayBuffer): Promise<FontMetadata> {
    const fontPath = `${STORAGE_PREFIX}files/${metadata.filename}`
    const metadataPath = `${STORAGE_PREFIX}metadata/${metadata.filename}.json`
    
    try {
      // Store font file
      const fontBlob = await put(fontPath, buffer, {
        access: 'public',
        contentType: this.getContentType(metadata.format)
      })
      
      // Enhanced metadata with blob URL
      const enhancedMetadata: FontMetadata = {
        ...metadata,
        url: fontBlob.url,
        storage: 'vercel-blob',
        uploadedAt: new Date().toISOString(),
        published: metadata.published ?? true
      }
      
      // Store metadata as separate file (NO RACE CONDITIONS)
      await put(metadataPath, JSON.stringify(enhancedMetadata, null, 2), {
        access: 'public',
        contentType: 'application/json'
      })
      
      console.log(`✅ Font stored in blob: ${metadata.family}`)
      return enhancedMetadata
      
    } catch (error) {
      console.error('❌ Blob storage error:', error)
      throw new Error(`Blob storage failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  /**
   * Store font locally for development
   */
  private async storeFontLocally(metadata: FontMetadata, buffer: ArrayBuffer): Promise<FontMetadata> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      console.log(`🔍 V2 Local storage starting for: ${metadata.filename}`)
      
      const fontsDir = path.join(process.cwd(), 'public', 'fonts')
      await fs.mkdir(fontsDir, { recursive: true })
      console.log(`✅ Fonts directory ensured: ${fontsDir}`)
      
      // Save font file
      const fontPath = path.join(fontsDir, metadata.filename)
      await fs.writeFile(fontPath, new Uint8Array(buffer))
      console.log(`✅ Font file written: ${fontPath}`)
      
      // Enhanced metadata
      const enhancedMetadata: FontMetadata = {
        ...metadata,
        url: `/fonts/${metadata.filename}`,
        storage: 'local-dev-v2',
        uploadedAt: new Date().toISOString(),
        published: metadata.published ?? true
      }
      
      // Save metadata as individual file
      const metadataPath = path.join(fontsDir, `${metadata.filename}.meta.json`)
      await fs.writeFile(metadataPath, JSON.stringify(enhancedMetadata, null, 2))
      console.log(`✅ Metadata file written: ${metadataPath}`)
      
      console.log(`✅ Font stored locally with V2: ${metadata.family}`)
      return enhancedMetadata
      
    } catch (error) {
      console.error('❌ V2 Local storage error:', error)
      throw new Error(`V2 Local storage failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  /**
   * Get all fonts with robust error handling
   */
  async getAllFonts(): Promise<FontMetadata[]> {
    console.log('📋 Loading all fonts...')
    
    try {
      if (this.hasBlob && this.isProduction) {
        return await this.loadFontsFromBlob()
      } else {
        return await this.loadFontsFromLocal()
      }
    } catch (error) {
      console.error('❌ Font loading error:', error)
      
      // Graceful fallback
      if (this.isProduction) {
        try {
          return await this.loadFontsFromLocal()
        } catch (fallbackError) {
          console.error('❌ Fallback loading failed:', fallbackError)
          return []
        }
      }
      
      return []
    }
  }

  /**
   * Load fonts from blob storage
   */
  private async loadFontsFromBlob(): Promise<FontMetadata[]> {
    try {
      const { blobs } = await list({ prefix: `${STORAGE_PREFIX}metadata/` })
      const fonts: FontMetadata[] = []
      
      for (const blob of blobs) {
        if (blob.pathname.endsWith('.json')) {
          try {
            const response = await fetch(blob.url)
            if (response.ok) {
              const metadata = await response.json()
              fonts.push(metadata)
            }
          } catch (error) {
            console.warn(`⚠️ Failed to load metadata: ${blob.pathname}`)
          }
        }
      }
      
      console.log(`✅ Loaded ${fonts.length} fonts from blob storage`)
      return fonts
      
    } catch (error) {
      console.error('❌ Blob loading error:', error)
      throw error
    }
  }

  /**
   * Load fonts from local storage
   */
  private async loadFontsFromLocal(): Promise<FontMetadata[]> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const fontsDir = path.join(process.cwd(), 'public', 'fonts')
      
      try {
        const files = await fs.readdir(fontsDir)
        const metadataFiles = files.filter(f => f.endsWith('.meta.json'))
        const fonts: FontMetadata[] = []
        
        for (const file of metadataFiles) {
          try {
            const filePath = path.join(fontsDir, file)
            const data = await fs.readFile(filePath, 'utf-8')
            const metadata = JSON.parse(data)
            fonts.push(metadata)
          } catch (error) {
            console.warn(`⚠️ Failed to load metadata: ${file}`)
          }
        }
        
        console.log(`✅ Loaded ${fonts.length} fonts from local storage`)
        return fonts
        
      } catch (error) {
        console.log('📝 No local fonts directory found')
        return []
      }
    } catch (error) {
      console.error('❌ Local loading error:', error)
      return []
    }
  }

  /**
   * Remove font with cleanup
   */
  async removeFont(filename: string): Promise<boolean> {
    console.log(`🗑️ Removing font: ${filename}`)
    
    try {
      if (this.hasBlob && this.isProduction) {
        return await this.removeFontFromBlob(filename)
      } else {
        return await this.removeFontFromLocal(filename)
      }
    } catch (error) {
      console.error('❌ Font removal error:', error)
      return false
    }
  }

  private async removeFontFromBlob(filename: string): Promise<boolean> {
    try {
      const fontPath = `${STORAGE_PREFIX}files/${filename}`
      const metadataPath = `${STORAGE_PREFIX}metadata/${filename}.json`
      
      // Remove both files
      await Promise.all([
        del(fontPath),
        del(metadataPath)
      ])
      
      console.log(`✅ Font removed from blob: ${filename}`)
      return true
      
    } catch (error) {
      console.error('❌ Blob removal error:', error)
      return false
    }
  }

  private async removeFontFromLocal(filename: string): Promise<boolean> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const fontsDir = path.join(process.cwd(), 'public', 'fonts')
      const fontPath = path.join(fontsDir, filename)
      const metadataPath = path.join(fontsDir, `${filename}.meta.json`)
      
      // Remove both files
      await Promise.all([
        fs.unlink(fontPath).catch(() => {}), // Ignore if file doesn't exist
        fs.unlink(metadataPath).catch(() => {})
      ])
      
      console.log(`✅ Font removed locally: ${filename}`)
      return true
      
    } catch (error) {
      console.error('❌ Local removal error:', error)
      return false
    }
  }

  /**
   * Update font metadata
   */
  async updateFont(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    console.log(`✏️ Updating font: ${filename}`)
    
    try {
      // Get current metadata
      const allFonts = await this.getAllFonts()
      const currentFont = allFonts.find(f => f.filename === filename)
      
      if (!currentFont) {
        console.error(`❌ Font not found: ${filename}`)
        return false
      }
      
      // Merge updates
      const updatedFont = { ...currentFont, ...updates }
      
      if (this.hasBlob && this.isProduction) {
        return await this.updateFontInBlob(filename, updatedFont)
      } else {
        return await this.updateFontLocally(filename, updatedFont)
      }
    } catch (error) {
      console.error('❌ Font update error:', error)
      return false
    }
  }

  private async updateFontInBlob(filename: string, metadata: FontMetadata): Promise<boolean> {
    try {
      const metadataPath = `${STORAGE_PREFIX}metadata/${filename}.json`
      
      await put(metadataPath, JSON.stringify(metadata, null, 2), {
        access: 'public',
        contentType: 'application/json'
      })
      
      console.log(`✅ Font metadata updated in blob: ${filename}`)
      return true
      
    } catch (error) {
      console.error('❌ Blob update error:', error)
      return false
    }
  }

  private async updateFontLocally(filename: string, metadata: FontMetadata): Promise<boolean> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const fontsDir = path.join(process.cwd(), 'public', 'fonts')
      const metadataPath = path.join(fontsDir, `${filename}.meta.json`)
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
      
      console.log(`✅ Font metadata updated locally: ${filename}`)
      return true
      
    } catch (error) {
      console.error('❌ Local update error:', error)
      return false
    }
  }

  /**
   * Get storage info for diagnostics
   */
  getStorageInfo() {
    return {
      type: this.hasBlob && this.isProduction ? 'Vercel Blob (Persistent)' : 
            this.isProduction ? 'Memory Only (NO BLOB TOKEN)' : 'Local Development',
      hasBlob: this.hasBlob,
      isProduction: this.isProduction,
      environment: process.env.NODE_ENV
    }
  }

  private getContentType(format: string): string {
    const types: { [key: string]: string } = {
      'ttf': 'font/ttf',
      'otf': 'font/otf',
      'woff': 'font/woff',
      'woff2': 'font/woff2'
    }
    return types[format.toLowerCase()] || 'application/octet-stream'
  }
}

// Export singleton
export const fontStorageV2 = FontStorageV2.getInstance()