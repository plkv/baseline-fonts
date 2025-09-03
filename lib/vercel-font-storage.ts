import { put, list, del } from '@vercel/blob'
import { kv } from '@vercel/kv'
import { FontMetadata } from './font-parser'

const KV_FONTS_KEY = 'fonts:metadata'

export class VercelFontStorage {
  
  async addFont(fontMetadata: FontMetadata, fontBuffer: ArrayBuffer): Promise<FontMetadata> {
    try {
      // Upload font file to Vercel Blob Storage
      const blob = await put(
        `fonts/${fontMetadata.filename}`,
        new Uint8Array(fontBuffer),
        {
          access: 'public',
          contentType: this.getContentType(fontMetadata.format)
        }
      )
      
      // Add blob URL to metadata
      const enhancedMetadata = {
        ...fontMetadata,
        url: blob.url,
        blobUrl: blob.url,
        uploadedAt: new Date().toISOString()
      }
      
      // Store metadata in Vercel KV
      const existingFonts = await this.getAllFonts()
      const updatedFonts = existingFonts.filter(f => f.filename !== fontMetadata.filename)
      updatedFonts.push(enhancedMetadata)
      
      await kv.set(KV_FONTS_KEY, updatedFonts)
      
      console.log(`✅ Font stored: ${fontMetadata.family} -> ${blob.url}`)
      return enhancedMetadata
      
    } catch (error) {
      console.error('Vercel storage error:', error)
      
      // Fallback to in-memory storage for development
      return {
        ...fontMetadata,
        url: `/fonts/${fontMetadata.filename}`,
        uploadedAt: new Date().toISOString(),
        fallback: true
      }
    }
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    try {
      const fonts = await kv.get<FontMetadata[]>(KV_FONTS_KEY)
      return fonts || []
    } catch (error) {
      console.error('KV retrieval error:', error)
      return []
    }
  }

  async removeFont(filename: string): Promise<boolean> {
    try {
      // Remove from Vercel Blob
      await del(`fonts/${filename}`)
      
      // Remove from KV metadata
      const existingFonts = await this.getAllFonts()
      const updatedFonts = existingFonts.filter(f => f.filename !== filename)
      await kv.set(KV_FONTS_KEY, updatedFonts)
      
      return true
    } catch (error) {
      console.error('Font removal error:', error)
      return false
    }
  }

  async updateFontMetadata(filename: string, updates: Partial<FontMetadata>): Promise<boolean> {
    try {
      const existingFonts = await this.getAllFonts()
      const updatedFonts = existingFonts.map(font => 
        font.filename === filename ? { ...font, ...updates } : font
      )
      await kv.set(KV_FONTS_KEY, updatedFonts)
      return true
    } catch (error) {
      console.error('Metadata update error:', error)
      return false
    }
  }

  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'ttf':
        return 'font/ttf'
      case 'otf':
        return 'font/otf'
      case 'woff':
        return 'font/woff'
      case 'woff2':
        return 'font/woff2'
      default:
        return 'application/octet-stream'
    }
  }
}

// Export singleton instance
export const vercelFontStorage = new VercelFontStorage()