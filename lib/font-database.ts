import { FontMetadata } from './font-parser'

// In-memory storage for Vercel serverless environment
// Note: This will not persist across deployments
class InMemoryFontStorage {
  private fonts: FontMetadata[] = []
  private lastUpdated: string = new Date().toISOString()

  async addFont(font: FontMetadata) {
    // Remove any existing font with same filename
    this.fonts = this.fonts.filter(f => f.filename !== font.filename)
    
    // Add new font
    this.fonts.push(font)
    this.lastUpdated = new Date().toISOString()
    
    return font
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    return [...this.fonts] // Return a copy
  }
}

export class FontStorage extends InMemoryFontStorage {}

export const fontStorage = new FontStorage()