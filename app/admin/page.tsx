"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun, Upload, Trash2, Edit2, Save, X, Plus, ChevronDown, Wrench, RotateCcw } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Configuration constants
const FONT_CATEGORIES = ["Sans Serif", "Serif", "Display", "Monospace", "Script", "Pixel"]
const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const WEIGHT_NAMES = {
  100: "Thin",
  200: "ExtraLight", 
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black"
}

interface FontFile {
  name: string
  family: string
  style: string
  weight: number
  isVariable: boolean
  format: string
  fileSize: number
  uploadedAt: string
  filename: string
  path: string
  styles: number
  features: string[]
  category: string
  price: string
  availableStyles: string[]
  availableWeights: number[]
  variableAxes?: any[]
  openTypeFeatures: string[]
  languages: string[]
  foundry: string
  url: string
  storage?: string
}

interface FontFamily {
  name: string
  category: string
  foundry: string
  languages: string[]
  openTypeFeatures: string[]
  fonts: FontFile[]
  totalStyles: number
  availableWeights: number[]
  price: string
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(false)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const [editingFamily, setEditingFamily] = useState<string | null>(null)
  const [editingFont, setEditingFont] = useState<string | null>(null)
  const [familyFormData, setFamilyFormData] = useState<any>({})
  const [fontFormData, setFontFormData] = useState<any>({})
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Auto-detect system theme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setDarkMode(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Load and group fonts by family
  const loadFonts = async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts/list')
      const data = await response.json()
      
      if (data.success && data.fonts) {
        const groupedFonts = groupFontsByFamily(data.fonts)
        setFontFamilies(groupedFonts)
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
      toast.error('Failed to load fonts')
    } finally {
      setIsLoadingFonts(false)
    }
  }

  // Group fonts by family name
  const groupFontsByFamily = (fonts: FontFile[]): FontFamily[] => {
    const families: { [key: string]: FontFile[] } = {}
    
    fonts.forEach(font => {
      const familyName = font.family
      if (!families[familyName]) {
        families[familyName] = []
      }
      families[familyName].push(font)
    })

    return Object.entries(families).map(([familyName, familyFonts]) => {
      // Use the most recent font's metadata for family-level info
      const representativeFont = familyFonts.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]

      // Aggregate unique values across all fonts in family
      const allWeights = [...new Set(familyFonts.flatMap(f => f.availableWeights))].sort((a, b) => a - b)
      const allFeatures = [...new Set(familyFonts.flatMap(f => f.openTypeFeatures))]
      const allLanguages = [...new Set(familyFonts.flatMap(f => f.languages))]

      return {
        name: familyName,
        category: representativeFont.category,
        foundry: representativeFont.foundry,
        languages: allLanguages,
        openTypeFeatures: allFeatures,
        fonts: familyFonts.sort((a, b) => a.weight - b.weight),
        totalStyles: familyFonts.length,
        availableWeights: allWeights,
        price: representativeFont.price
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }

  useEffect(() => {
    loadFonts()
  }, [])

  // Font loading for previews (inject CSS)
  useEffect(() => {
    const allFonts = fontFamilies.flatMap(family => family.fonts)
    
    allFonts.forEach(font => {
      // Validate font has required properties
      if (!font.url || !font.family) {
        console.warn(`⚠️ Font ${font.family || font.name || 'Unknown'} has no URL, skipping CSS generation`)
        return
      }
      
      // Create normalized family name for CSS
      const normalizedName = `TestFont-${font.family.replace(/[^a-zA-Z0-9]/g, '')}`
      
      // Skip if already loaded
      if (loadedFonts.has(font.family)) return
      
      // Additional URL validation
      if (!font.url.startsWith('/') && !font.url.startsWith('http')) {
        console.warn(`⚠️ Font ${font.family} has invalid URL format: "${font.url}", skipping CSS generation`)
        return
      }
      
      // Inject CSS for font
      const style = document.createElement('style')
      style.setAttribute('data-font-injection', font.family)
      
      // Add cache-busting timestamp if needed
      const cacheClearTime = localStorage.getItem('font-cache-cleared')
      const cacheBuster = cacheClearTime ? `?v=${cacheClearTime}` : ''
      
      style.textContent = `
        @font-face {
          font-family: "${normalizedName}";
          src: url("${font.url}${cacheBuster}") format("${font.format === 'otf' ? 'opentype' : 'truetype'}"),
               url("${font.url}${cacheBuster}") format("truetype");
          font-weight: ${font.weight};
          font-style: normal;
          font-display: swap;
        }
        .font-preview-${normalizedName} {
          font-family: "${normalizedName}", "${font.family}", monospace !important;
        }
      `
      
      document.head.appendChild(style)
      console.log(`📝 Injected CSS for ${font.family} (${normalizedName}) from ${font.url}`)
      
      // Test font loading with FontFace API
      if ('fonts' in document) {
        try {
          const fontFace = new FontFace(normalizedName, `url("${font.url}${cacheBuster}")`, {
            weight: font.weight.toString(),
            style: 'normal'
          })
          fontFace.load().then(() => {
            setLoadedFonts(prev => new Set([...prev, font.family]))
            console.log(`✅ Font loaded successfully: ${font.family}`)
          }).catch((error) => {
            console.error(`❌ Failed to load font ${font.family}:`, error)
            console.error(`   URL: ${font.url}`)
            console.error(`   Format: ${font.format}`)
            console.error(`   Weight: ${font.weight}`)
          })
        } catch (error) {
          console.error(`❌ FontFace creation failed for ${font.family}:`, error)
          console.error(`   This might be due to invalid URL or unsupported format`)
        }
      }
    })
  }, [fontFamilies])

  const handleUpload = async (file: File, targetFamily?: string) => {
    if (!file) return
    
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    if (targetFamily) {
      formData.append('targetFamily', targetFamily)
    }

    try {
      const response = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Font uploaded successfully', {
          description: `${result.font?.family} added to collection`
        })
        // Reload fonts after successful upload
        loadFonts()
      } else {
        toast.error('Upload failed', {
          description: result.error
        })
      }
    } catch (error) {
      toast.error('Upload error', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFamilyEdit = (familyName: string) => {
    const family = fontFamilies.find(f => f.name === familyName)
    if (!family) return

    setEditingFamily(familyName)
    setFamilyFormData({
      category: family.category,
      foundry: family.foundry,
      languages: family.languages.join(', '),
      openTypeFeatures: family.openTypeFeatures.join(', '),
      price: family.price
    })
  }

  const handleFontEdit = (fontFilename: string) => {
    const font = fontFamilies
      .flatMap(family => family.fonts)
      .find(f => f.filename === fontFilename)
    if (!font) return

    setEditingFont(fontFilename)
    setFontFormData({
      style: font.style,
      weight: font.weight,
      category: font.category,
      foundry: font.foundry,
      languages: font.languages.join(', '),
      openTypeFeatures: font.openTypeFeatures.join(', ')
    })
  }

  const handleSaveFamilyEdit = async (familyName: string) => {
    try {
      // Update all fonts in the family
      const family = fontFamilies.find(f => f.name === familyName)
      if (!family) return

      for (const font of family.fonts) {
        const response = await fetch('/api/fonts/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: font.filename,
            updates: {
              category: familyFormData.category,
              foundry: familyFormData.foundry,
              languages: familyFormData.languages.split(',').map((l: string) => l.trim()),
              openTypeFeatures: familyFormData.openTypeFeatures.split(',').map((f: string) => f.trim()),
              price: familyFormData.price
            }
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update font')
        }
      }

      setEditingFamily(null)
      setFamilyFormData({})
      toast.success('Family metadata updated successfully')
      loadFonts()
    } catch (error) {
      toast.error('Failed to update family')
    }
  }

  const handleSaveFontEdit = async (fontFilename: string) => {
    try {
      const response = await fetch('/api/fonts/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fontFilename,
          updates: {
            style: fontFormData.style,
            weight: parseInt(fontFormData.weight),
            category: fontFormData.category,
            foundry: fontFormData.foundry,
            languages: fontFormData.languages.split(',').map((l: string) => l.trim()),
            openTypeFeatures: fontFormData.openTypeFeatures.split(',').map((f: string) => f.trim())
          }
        })
      })

      if (response.ok) {
        setEditingFont(null)
        setFontFormData({})
        toast.success('Font metadata updated successfully')
        loadFonts()
      } else {
        const error = await response.json()
        toast.error('Failed to update font', {
          description: error.error
        })
      }
    } catch (error) {
      toast.error('Failed to update font')
    }
  }

  const handleDeleteFont = async (fontFilename: string) => {
    const font = fontFamilies
      .flatMap(family => family.fonts)
      .find(f => f.filename === fontFilename)
    if (!font) return
    
    if (!confirm(`Are you sure you want to permanently delete "${font.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/fonts/delete?filename=${encodeURIComponent(fontFilename)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Font deleted successfully')
        loadFonts()
      } else {
        toast.error('Failed to delete font')
      }
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const handleDatabaseCleanup = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/fonts/cleanup', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        if (result.issuesFixed > 0) {
          toast.success('Database cleanup completed', {
            description: `Fixed ${result.issuesFixed} issues in ${result.fontsChecked} fonts`
          })
          // Reload fonts to reflect any changes
          loadFonts()
        } else {
          toast.success('Database is already clean', {
            description: `Checked ${result.fontsChecked} fonts - no issues found`
          })
        }
        
        // Clear browser font cache to prevent 404 errors from old references
        if (result.missingFiles && result.missingFiles.length > 0) {
          console.log('🗑️ Clearing browser cache for missing files:', result.missingFiles)
          clearBrowserFontCache()
        }
      } else {
        toast.error('Cleanup failed', {
          description: result.error
        })
      }
    } catch (error) {
      toast.error('Cleanup error', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearBrowserFontCache = () => {
    try {
      // Clear font face cache
      if ('fonts' in document && document.fonts.clear) {
        document.fonts.clear()
        console.log('🧹 Cleared document.fonts cache')
      }
      
      // Remove ALL font stylesheets (not just data-font-injection ones)
      const allStyles = document.querySelectorAll('style')
      allStyles.forEach(style => {
        if (style.textContent && style.textContent.includes('@font-face')) {
          style.remove()
          console.log('🗑️ Removed font stylesheet')
        }
      })
      
      // Remove old font stylesheets with data-font-injection
      const fontStyles = document.querySelectorAll('style[data-font-injection]')
      fontStyles.forEach(style => style.remove())
      
      // Clear loaded fonts set to force re-validation
      setLoadedFonts(new Set())
      
      // Clear any localStorage font data
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('font') || key.includes('Font'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        console.log(`🗑️ Removed localStorage key: ${key}`)
      })
      
      // Force browser cache reload by adding timestamp to URLs
      const timestamp = Date.now()
      localStorage.setItem('font-cache-cleared', timestamp.toString())
      
      // Clear font families state to force reload
      setFontFamilies([])
      
      // Force reload fonts from server
      setTimeout(() => {
        loadFonts()
      }, 100)
      
      toast.success('Browser font cache cleared', {
        description: 'Font data reloaded from server. Phantom fonts should disappear.'
      })
      
      console.log('🧹 Comprehensive browser font cache cleared')
    } catch (error) {
      console.warn('⚠️ Cache clearing failed:', error)
    }
  }

  const renderFontPreview = (font: FontFile) => {
    const normalizedName = font.family.replace(/[^a-zA-Z0-9]/g, '')
    const isLoaded = loadedFonts.has(font.family)
    
    return (
      <div className={`p-3 rounded border ${darkMode ? 'bg-stone-800 border-stone-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-2xl mb-2 font-preview-TestFont-${normalizedName}`}>
          The quick brown fox jumps over the lazy dog
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Status:</strong> {isLoaded ? '✅ Loaded' : '❌ Loading...'}</div>
          <div><strong>Weight:</strong> {font.weight} ({(WEIGHT_NAMES as any)[font.weight] || 'Unknown'})</div>
          <div><strong>Format:</strong> {font.format.toUpperCase()}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-stone-950' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className={`p-8 rounded-lg shadow ${darkMode ? 'bg-stone-900 border border-stone-800' : 'bg-white'}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-stone-100' : 'bg-gray-900'}`}>
                <Shield className={`w-6 h-6 ${darkMode ? 'text-stone-900' : 'text-white'}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                  Font Family Management
                </h1>
                <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                  Manage font families, upload weights, and edit metadata
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className={darkMode ? 'border-stone-700' : ''}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              {/* Cache Clear Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearBrowserFontCache}
                disabled={isLoading}
                className={`gap-2 ${darkMode ? 'border-stone-700' : ''}`}
                title="Clear browser font cache to fix 404 errors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Cache
              </Button>
              
              {/* Database Cleanup Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDatabaseCleanup}
                disabled={isLoading}
                className={`gap-2 ${darkMode ? 'border-stone-700' : ''}`}
                title="Clean up database issues like missing URLs"
              >
                <Wrench className="w-4 h-4" />
                Cleanup DB
              </Button>
              
              {/* Global Upload Button */}
              <div>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  id="global-font-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                  }}
                />
                <Button
                  onClick={() => document.getElementById('global-font-upload')?.click()}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isLoading ? 'Processing...' : 'New Font'}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                {fontFamilies.length}
              </div>
              <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                Font Families
              </div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                {fontFamilies.reduce((sum, family) => sum + family.totalStyles, 0)}
              </div>
              <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                Total Font Files
              </div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                {loadedFonts.size}
              </div>
              <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                Loaded Fonts
              </div>
            </div>
          </div>

          {/* Font Families Accordion */}
          {isLoadingFonts ? (
            <div className="text-center py-8">
              <div className={`text-lg ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                Loading fonts...
              </div>
            </div>
          ) : fontFamilies.length === 0 ? (
            <div className="text-center py-8">
              <div className={`text-lg ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                No fonts uploaded yet. Upload your first font to get started.
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {fontFamilies.map((family) => (
                <AccordionItem
                  key={family.name}
                  value={family.name}
                  className={`border rounded-lg ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-gray-200 bg-white'}`}
                >
                  <AccordionTrigger className={`px-6 py-4 hover:no-underline ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-lg font-semibold text-left">{family.name}</div>
                          <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                            {family.totalStyles} styles • {family.category} • {family.foundry}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {family.availableWeights.map(w => (WEIGHT_NAMES as any)[w] || w).join(', ')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {family.category}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-6">
                    {/* Family-level editing */}
                    {editingFamily === family.name ? (
                      <div className={`mb-6 p-4 rounded-lg border ${darkMode ? 'bg-stone-900 border-stone-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`font-medium ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                            Edit Family Metadata
                          </h4>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveFamilyEdit(family.name)}
                              className="gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingFamily(null)
                                setFamilyFormData({})
                              }}
                              className="gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                              Category
                            </label>
                            <Select
                              value={familyFormData.category || family.category}
                              onValueChange={(value) => setFamilyFormData({...familyFormData, category: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                              Foundry
                            </label>
                            <Input
                              value={familyFormData.foundry || family.foundry}
                              onChange={(e) => setFamilyFormData({...familyFormData, foundry: e.target.value})}
                              placeholder="Font foundry"
                            />
                          </div>
                          
                          <div>
                            <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                              Languages (comma separated)
                            </label>
                            <Input
                              value={familyFormData.languages || family.languages.join(', ')}
                              onChange={(e) => setFamilyFormData({...familyFormData, languages: e.target.value})}
                              placeholder="Latin, Greek, Cyrillic"
                            />
                          </div>
                          
                          <div>
                            <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                              OpenType Features (comma separated)
                            </label>
                            <Input
                              value={familyFormData.openTypeFeatures || family.openTypeFeatures.join(', ')}
                              onChange={(e) => setFamilyFormData({...familyFormData, openTypeFeatures: e.target.value})}
                              placeholder="Kerning, Standard Ligatures"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-6">
                        <div className="grid grid-cols-4 gap-4 flex-1">
                          <div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-1`}>
                              Category
                            </div>
                            <Badge variant="outline">{family.category}</Badge>
                          </div>
                          <div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-1`}>
                              Foundry
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-stone-300' : 'text-gray-700'}`}>
                              {family.foundry}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-1`}>
                              Languages
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-stone-300' : 'text-gray-700'}`}>
                              {family.languages.slice(0, 2).join(', ')}
                              {family.languages.length > 2 && ` +${family.languages.length - 2}`}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-1`}>
                              Features
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-stone-300' : 'text-gray-700'}`}>
                              {family.openTypeFeatures.slice(0, 2).join(', ')}
                              {family.openTypeFeatures.length > 2 && ` +${family.openTypeFeatures.length - 2}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFamilyEdit(family.name)}
                          className="gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Family
                        </Button>
                      </div>
                    )}

                    {/* Upload to Family */}
                    <div className="mb-6">
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        id={`upload-${family.name}`}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(file, family.name)
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`upload-${family.name}`)?.click()}
                        className="gap-2"
                        disabled={isLoading}
                      >
                        <Plus className="w-3 h-3" />
                        Add Weight to {family.name}
                      </Button>
                    </div>

                    {/* Font Files */}
                    <div className="space-y-4">
                      {family.fonts.map((font) => (
                        <div
                          key={font.filename}
                          className={`p-4 rounded-lg border ${darkMode ? 'bg-stone-900/50 border-stone-600' : 'bg-gray-50 border-gray-200'}`}
                        >
                          {editingFont === font.filename ? (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h5 className={`font-medium ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                                  Edit {font.filename}
                                </h5>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveFontEdit(font.filename)}
                                    className="gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingFont(null)
                                      setFontFormData({})
                                    }}
                                    className="gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                                    Style
                                  </label>
                                  <Input
                                    value={fontFormData.style || font.style}
                                    onChange={(e) => setFontFormData({...fontFormData, style: e.target.value})}
                                    placeholder="Regular, Bold, Italic"
                                  />
                                </div>
                                
                                <div>
                                  <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                                    Weight
                                  </label>
                                  <Select
                                    value={fontFormData.weight?.toString() || font.weight.toString()}
                                    onValueChange={(value) => setFontFormData({...fontFormData, weight: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_WEIGHTS.map(weight => (
                                        <SelectItem key={weight} value={weight.toString()}>
                                          {weight} - {(WEIGHT_NAMES as any)[weight]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                                    Category
                                  </label>
                                  <Select
                                    value={fontFormData.category || font.category}
                                    onValueChange={(value) => setFontFormData({...fontFormData, category: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FONT_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {renderFontPreview(font)}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <div className={`font-medium ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                                      {font.style} - {font.weight}
                                    </div>
                                    <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                                      {font.filename} • {(font.fileSize / 1024).toFixed(1)}KB
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {(WEIGHT_NAMES as any)[font.weight] || font.weight}
                                  </Badge>
                                  <Badge 
                                    variant={loadedFonts.has(font.family) ? "default" : "destructive"} 
                                    className="text-xs"
                                  >
                                    {loadedFonts.has(font.family) ? '✅ Loaded' : '❌ Failed'}
                                  </Badge>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFontEdit(font.filename)}
                                    className="gap-1"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteFont(font.filename)}
                                    className="gap-1 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              {renderFontPreview(font)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
      
      <Toaster 
        position="top-center"
        richColors 
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  )
}