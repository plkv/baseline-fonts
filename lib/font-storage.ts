/**
 * Clean Font Storage - Single, Simple, Reliable
 * Replaces the 5 different storage implementations with one clean solution
 */

import { kv } from '@vercel/kv'
import { put as blobPut, del as blobDel } from '@vercel/blob'
import { Font, FontFamily, FilterState } from './types'

class FontStorage {
  private static instance: FontStorage
  
  static getInstance(): FontStorage {
    if (!FontStorage.instance) {
      FontStorage.instance = new FontStorage()
    }
    return FontStorage.instance
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  /**
   * Upload and store a new font
   */
  async uploadFont(file: File, metadata: Partial<Font> = {}): Promise<Font> {
    const id = `font_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    // Upload file to Blob
    const blob = await blobPut(file.name, file, {
      access: 'public',
      addRandomSuffix: true
    })
    
    // Create font record with defaults
    const font: Font = {
      id,
      name: metadata.name || file.name.replace(/\.[^/.]+$/, ""),
      family: metadata.family || file.name.replace(/\.[^/.]+$/, ""),
      
      // File info
      blob: blob.url,
      format: this.getFileFormat(file.name),
      size: file.size,
      filename: file.name,
      
      // Default metadata (will be enhanced by parser)
      weight: 400,
      style: 'Regular',
      isVariable: false,
      variableAxes: [],
      features: [],
      languages: ['Latin'],
      
      // Organization
      collection: metadata.collection || 'Text',
      tags: metadata.tags || [],
      category: metadata.category || ['Sans'],
      
      // Admin
      published: metadata.published ?? true,
      downloadUrl: metadata.downloadUrl,
      uploadedAt: new Date(),
      
      // Extended metadata
      ...metadata
    }
    
    // Store in KV
    await kv.set(font.id, font)
    await this.addToIndex(font.id)
    
    console.log(`✅ Font uploaded: ${font.name} (${font.id})`)
    return font
  }

  /**
   * Get font by ID
   */
  async getFont(id: string): Promise<Font | null> {
    return await kv.get<Font>(id)
  }

  /**
   * Get all fonts with optional filtering
   */
  async getAllFonts(filters?: FilterState): Promise<Font[]> {
    const fontIds = await this.getAllFontIds()
    const fonts: Font[] = []
    
    // Batch fetch fonts
    for (const id of fontIds) {
      const font = await kv.get<Font>(id)
      if (font && (font.published || filters?.search)) {
        fonts.push(font)
      }
    }
    
    // Apply filters
    return this.applyFilters(fonts, filters)
  }

  /**
   * Update font metadata
   */
  async updateFont(id: string, updates: Partial<Font>): Promise<Font | null> {
    const existing = await this.getFont(id)
    if (!existing) return null
    
    const updated = { 
      ...existing, 
      ...updates,
      id: existing.id // Prevent ID changes
    }
    
    await kv.set(id, updated)
    console.log(`✅ Font updated: ${updated.name} (${id})`)
    return updated
  }

  /**
   * Delete font completely
   */
  async deleteFont(id: string): Promise<boolean> {
    const font = await this.getFont(id)
    if (!font) return false
    
    try {
      // Delete file from Blob
      await blobDel(font.blob)
      
      // Delete metadata from KV
      await kv.del(id)
      await this.removeFromIndex(id)
      
      console.log(`✅ Font deleted: ${font.name} (${id})`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete font ${id}:`, error)
      return false
    }
  }

  // ============================================
  // FAMILY OPERATIONS
  // ============================================

  /**
   * Get fonts grouped by family
   */
  async getFontFamilies(filters?: FilterState): Promise<FontFamily[]> {
    const fonts = await this.getAllFonts(filters)
    
    // Group by family name
    const familyMap = fonts.reduce((acc, font) => {
      if (!acc[font.family]) {
        acc[font.family] = []
      }
      acc[font.family].push(font)
      return acc
    }, {} as Record<string, Font[]>)
    
    // Convert to FontFamily objects
    return Object.entries(familyMap).map(([name, fonts]) => {
      // Find default font (Regular, then lowest weight, then first)
      const defaultFont = fonts.find(f => f.style === 'Regular') ||
                          fonts.sort((a, b) => a.weight - b.weight)[0]
      
      return {
        name,
        fonts: fonts.sort((a, b) => a.weight - b.weight), // Sort by weight
        defaultFontId: defaultFont.id,
        collection: defaultFont.collection,
        tags: [...new Set(fonts.flatMap(f => f.tags))].sort(),
        categories: [...new Set(fonts.flatMap(f => f.category))] as any,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private getFileFormat(filename: string): Font['format'] {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      return ext as Font['format']
    }
    return 'ttf' // Default fallback
  }

  private async getAllFontIds(): Promise<string[]> {
    try {
      return await kv.get<string[]>('font_index') || []
    } catch {
      return []
    }
  }

  private async addToIndex(id: string): Promise<void> {
    const index = await this.getAllFontIds()
    if (!index.includes(id)) {
      index.push(id)
      await kv.set('font_index', index)
    }
  }

  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.getAllFontIds()
    const newIndex = index.filter(fontId => fontId !== id)
    await kv.set('font_index', newIndex)
  }

  private applyFilters(fonts: Font[], filters?: FilterState): Font[] {
    if (!filters) return fonts
    
    return fonts.filter(font => {
      // Collection filter
      if (filters.collection && font.collection !== filters.collection) {
        return false
      }
      
      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.some(cat => font.category.includes(cat))) {
          return false
        }
      }
      
      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some(tag => font.tags.includes(tag))) {
          return false
        }
      }
      
      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        if (!filters.languages.some(lang => font.languages.includes(lang))) {
          return false
        }
      }
      
      // Weight filter
      if (filters.weights && filters.weights.length > 0) {
        if (!filters.weights.includes(font.weight)) {
          return false
        }
      }
      
      // Variable font filter
      if (filters.isVariable !== undefined && font.isVariable !== filters.isVariable) {
        return false
      }
      
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        if (
          !font.name.toLowerCase().includes(search) &&
          !font.family.toLowerCase().includes(search) &&
          !font.tags.some(tag => tag.toLowerCase().includes(search))
        ) {
          return false
        }
      }
      
      return true
    })
  }

  // ============================================
  // MIGRATION SUPPORT
  // ============================================

  /**
   * Bulk import fonts (for migration)
   */
  async bulkImport(fonts: Font[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0
    
    console.log(`🔄 Importing ${fonts.length} fonts...`)
    
    for (const font of fonts) {
      try {
        await kv.set(font.id, font)
        await this.addToIndex(font.id)
        success++
        
        if (success % 50 === 0) {
          console.log(`  Imported ${success}/${fonts.length} fonts...`)
        }
      } catch (error) {
        console.error(`❌ Failed to import font ${font.id}:`, error)
        failed++
      }
    }
    
    console.log(`✅ Import complete: ${success} success, ${failed} failed`)
    return { success, failed }
  }

  /**
   * Clear all data (for testing/migration)
   */
  async clearAll(): Promise<void> {
    const fontIds = await this.getAllFontIds()
    
    for (const id of fontIds) {
      await kv.del(id)
    }
    
    await kv.del('font_index')
    console.log(`🗑️  Cleared ${fontIds.length} fonts`)
  }
}

export const fontStorage = FontStorage.getInstance()
export { FontStorage }