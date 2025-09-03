import { promises as fs } from 'fs'
import path from 'path'
import { FontMetadata } from './font-parser'

const DB_FILE = path.join(process.cwd(), 'data', 'fonts.json')

interface FontDatabase {
  fonts: FontMetadata[]
  lastUpdated: string
}

export class FontStorage {
  private async ensureDataDir() {
    const dataDir = path.dirname(DB_FILE)
    await fs.mkdir(dataDir, { recursive: true })
  }

  private async loadDatabase(): Promise<FontDatabase> {
    try {
      const data = await fs.readFile(DB_FILE, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return { fonts: [], lastUpdated: new Date().toISOString() }
    }
  }

  private async saveDatabase(db: FontDatabase) {
    await this.ensureDataDir()
    db.lastUpdated = new Date().toISOString()
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2))
  }

  async addFont(font: FontMetadata) {
    const db = await this.loadDatabase()
    
    // Remove any existing font with same filename
    db.fonts = db.fonts.filter(f => f.filename !== font.filename)
    
    // Add new font
    db.fonts.push(font)
    
    await this.saveDatabase(db)
    return font
  }

  async getAllFonts(): Promise<FontMetadata[]> {
    const db = await this.loadDatabase()
    return db.fonts
  }
}

export const fontStorage = new FontStorage()