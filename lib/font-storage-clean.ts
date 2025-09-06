/**
 * Clean Font Storage - Blob + KV Only
 * Simple, reliable font management system
 */

import { kv } from '@vercel/kv'
import { put as blobPut, del as blobDel } from '@vercel/blob'

export interface FontMetadata {
  id: string
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  uploadedAt: string
  
  // User editable fields
  foundry: string
  downloadLink?: string
  languages: string[]
  
  // Storage info
  blobUrl: string
  
  // Enhanced metadata from OpenType
  category: string
  isVariable: boolean
  availableWeights: number[]
  availableStyles: string[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures: string[]
  version?: string
  copyright?: string
  license?: string
  glyphCount?: number
  embeddingPermissions?: string
  fontMetrics?: {
    ascender: number
    descender: number
    lineGap: number
    xHeight: number
    capHeight: number
    unitsPerEm: number
  }
  panoseClassification?: string
  creationDate?: string
  modificationDate?: string
  designerInfo?: {
    designer?: string
    designerURL?: string
    manufacturer?: string
    vendorURL?: string
    trademark?: string
  }
  description?: string
  styleTags: string[] // User-customizable style tags
}

class FontStorageClean {
  private static instance: FontStorageClean
  
  static getInstance(): FontStorageClean {
    if (!FontStorageClean.instance) {
      FontStorageClean.instance = new FontStorageClean()
    }
    return FontStorageClean.instance
  }

  /**
   * Upload a font file and store metadata with comprehensive OpenType parsing
   */
  async uploadFont(
    file: File,
    parseFont?: boolean
  ): Promise<FontMetadata> {
    const id = `font_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const uploadedAt = new Date().toISOString()
    
    // Upload file to Blob
    const blob = await blobPut(file.name, file, {
      access: 'public',
      addRandomSuffix: false
    })
    
    let extractedMetadata: Partial<FontMetadata> = {
      family: file.name.split('.')[0],
      style: 'Regular',
      weight: 400,
      foundry: 'Unknown',
      languages: ['Latin'],
      category: 'Sans Serif',
      isVariable: false,
      availableWeights: [400],
      availableStyles: ['Regular'],
      openTypeFeatures: ['Standard Ligatures', 'Kerning']
    }
    
    // Parse font metadata if requested (default: true)
    if (parseFont !== false) {
      try {
        const { parseFontFile } = await import('./font-parser')
        const buffer = await file.arrayBuffer()
        const parsedData = await parseFontFile(buffer, file.name, file.size)
        
        // Extract relevant fields from parsed data
        extractedMetadata = {
          family: parsedData.family,
          style: parsedData.style,
          weight: parsedData.weight,
          foundry: parsedData.foundry || 'Unknown',
          languages: parsedData.languages || ['Latin'],
          category: parsedData.category || 'Sans Serif',
          isVariable: parsedData.isVariable || false,
          availableWeights: parsedData.availableWeights || [parsedData.weight || 400],
          availableStyles: parsedData.availableStyles || [parsedData.style || 'Regular'],
          variableAxes: parsedData.variableAxes,
          openTypeFeatures: parsedData.openTypeFeatures || ['Standard Ligatures', 'Kerning'],
          // Additional metadata extraction would go here
        }
        
        console.log('✅ Font parsed successfully:', extractedMetadata.family)
      } catch (parseError) {
        console.warn('⚠️ Font parsing failed, using filename fallback:', parseError)
        // Keep default fallback metadata
      }
    }
    
    // Create full metadata
    const fullMetadata: FontMetadata = {
      id,
      filename: file.name,
      fileSize: file.size,
      format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      uploadedAt,
      blobUrl: blob.url,
      downloadLink: undefined,
      ...extractedMetadata
    }
    
    // Store metadata in KV
    await kv.set(id, fullMetadata)
    
    // Add to index
    await this.addToIndex(id)
    
    return fullMetadata
  }

  /**
   * Get all fonts
   */
  async getAllFonts(): Promise<FontMetadata[]> {
    const keys = await this.getAllFontKeys()
    const fonts: FontMetadata[] = []
    
    for (const key of keys) {
      const metadata = await kv.get<FontMetadata>(key)
      if (metadata) {
        fonts.push(metadata)
      }
    }
    
    return fonts.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }

  /**
   * Get font by ID
   */
  async getFontById(id: string): Promise<FontMetadata | null> {
    return await kv.get<FontMetadata>(id)
  }

  /**
   * Update font metadata - now supports all editable fields
   */
  async updateFont(id: string, updates: Partial<Pick<FontMetadata, 
    'family' | 'foundry' | 'downloadLink' | 'languages' | 'category' | 'weight' | 'styleTags'
  >>): Promise<boolean> {
    const existing = await this.getFontById(id)
    if (!existing) return false
    
    const updated = { ...existing, ...updates }
    await kv.set(id, updated)
    return true
  }

  /**
   * Delete font (both file and metadata)
   */
  async deleteFont(id: string): Promise<boolean> {
    const font = await this.getFontById(id)
    if (!font) return false
    
    // Delete from Blob
    await blobDel(font.blobUrl)
    
    // Delete from KV
    await kv.del(id)
    
    // Remove from index
    await this.removeFromIndex(id)
    
    return true
  }

  /**
   * Get all font keys from KV
   */
  private async getAllFontKeys(): Promise<string[]> {
    // In production, this would use KV scan operations
    // For now, we'll implement a simple approach
    const allKeys: string[] = []
    
    try {
      // KV doesn't have a direct "get all keys" method
      // We'll need to maintain an index or use a different approach
      
      // For this clean implementation, let's use a font index
      const fontIndex = await kv.get<string[]>('font_index') || []
      return fontIndex
    } catch {
      return []
    }
  }

  /**
   * Add font ID to index
   */
  private async addToIndex(id: string): Promise<void> {
    const index = await kv.get<string[]>('font_index') || []
    if (!index.includes(id)) {
      index.push(id)
      await kv.set('font_index', index)
    }
  }

  /**
   * Remove font ID from index
   */
  private async removeFromIndex(id: string): Promise<void> {
    const index = await kv.get<string[]>('font_index') || []
    const newIndex = index.filter(fontId => fontId !== id)
    await kv.set('font_index', newIndex)
  }
}

export const fontStorageClean = FontStorageClean.getInstance()