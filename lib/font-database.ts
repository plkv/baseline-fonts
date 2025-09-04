import { promises as fs } from 'fs'
import path from 'path'
import { FontMetadata } from './font-parser'

const FONTS_DATA_FILE = path.join(process.cwd(), 'public', 'fonts', 'fonts-data.json')
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

interface FontDatabase {
  fonts: FontMetadata[]
  lastUpdated: string
}

// Hybrid storage: in-memory for Vercel serverless + file storage for persistence
export class FontStorage {
  private memoryFonts: FontMetadata[] = []
  private initialized = false

  private async ensureFontsDir() {
    try {
      await fs.mkdir(FONTS_DIR, { recursive: true })
    } catch (error) {
      // Directory might already exist, or we're in a read-only environment
      console.log('Fonts directory setup:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async loadDatabase(): Promise<FontDatabase> {
    try {
      const data = await fs.readFile(FONTS_DATA_FILE, 'utf-8')
      const db = JSON.parse(data)
      this.memoryFonts = db.fonts || []
      return db
    } catch (error) {
      // File doesn't exist or can't be read, return empty database
      const emptyDb = { fonts: [], lastUpdated: new Date().toISOString() }
      this.memoryFonts = []
      return emptyDb
    }
  }

  private async saveDatabase(db: FontDatabase) {
    try {
      await this.ensureFontsDir()
      db.lastUpdated = new Date().toISOString()
      
      // Validate and clean up font data before saving
      db.fonts = this.validateFontData(db.fonts)
      
      await fs.writeFile(FONTS_DATA_FILE, JSON.stringify(db, null, 2))
    } catch (error) {
      console.log('Save database error (non-critical for Vercel):', error instanceof Error ? error.message : 'Unknown error')
      // On Vercel, this will fail, but we still have in-memory storage
    }
  }

  private validateFontData(fonts: FontMetadata[]): FontMetadata[] {
    return fonts.map(font => {
      // Ensure URL is properly set
      if (!font.url && font.filename) {
        // Generate URL from filename if missing
        font.url = `/fonts/${font.filename}`
        console.log(`🔧 Fixed missing URL for ${font.family}: ${font.url}`)
      }
      
      // Ensure required fields exist
      if (!font.family) {
        font.family = font.name || 'Unknown Family'
        console.log(`🔧 Fixed missing family for ${font.filename}: ${font.family}`)
      }
      
      if (!font.name) {
        font.name = font.family || 'Unknown Font'
        console.log(`🔧 Fixed missing name for ${font.filename}: ${font.name}`)
      }
      
      // Ensure arrays are not undefined
      if (!Array.isArray(font.openTypeFeatures)) {
        font.openTypeFeatures = ['Standard Ligatures', 'Kerning']
      }
      
      if (!Array.isArray(font.languages)) {
        font.languages = ['Latin']
      }
      
      if (!Array.isArray(font.availableStyles)) {
        font.availableStyles = [font.style || 'Regular']
      }
      
      if (!Array.isArray(font.availableWeights)) {
        font.availableWeights = [font.weight || 400]
      }
      
      return font
    }).filter(font => {
      // Remove fonts that are completely broken
      if (!font.filename || !font.family || !font.url) {
        console.warn(`⚠️ Removing broken font entry: ${JSON.stringify(font)}`)
        return false
      }
      return true
    })
  }

  private async initialize() {
    if (!this.initialized) {
      await this.loadDatabase()
      this.initialized = true
    }
  }

  async addFont(font: FontMetadata) {
    await this.initialize()
    
    // Remove any existing font with same filename
    this.memoryFonts = this.memoryFonts.filter(f => f.filename !== font.filename)
    
    // Add new font
    this.memoryFonts.push(font)
    
    // Try to save to file (will work in development, fail gracefully on Vercel)
    const db: FontDatabase = {
      fonts: this.memoryFonts,
      lastUpdated: new Date().toISOString()
    }
    
    await this.saveDatabase(db)
    return font
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    await this.initialize()
    return [...this.memoryFonts] // Return a copy
  }

  async saveFontFile(fontBuffer: ArrayBuffer, filename: string): Promise<string | null> {
    try {
      await this.ensureFontsDir()
      const fontPath = path.join(FONTS_DIR, filename)
      await fs.writeFile(fontPath, new Uint8Array(fontBuffer))
      return `/fonts/${filename}` // Return public URL path
    } catch (error) {
      console.log('Font file save error (expected on Vercel):', error instanceof Error ? error.message : 'Unknown error')
      return null // File saving failed, but metadata will still be stored
    }
  }
}

export const fontStorage = new FontStorage()