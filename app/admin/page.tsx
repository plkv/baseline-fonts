"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun, Upload } from "lucide-react"
import { toast, Toaster } from "sonner"
import FontFamilyAccordion from "@/components/admin/font-family-accordion"

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
  url?: string
  category: string
  foundry: string
  languages: string[]
  openTypeFeatures: string[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
}

interface FontFamily {
  name: string
  fonts: FontFile[]
  category: string
  foundry: string
  languages: string[]
  isVariable: boolean
  totalSize: number
  openTypeFeatures: string[]
  downloadLink?: string
}

export default function AdminPage() {
  const [fonts, setFonts] = useState<FontFile[]>([])
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingFonts, setIsLoadingFonts] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Dark mode detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Group fonts by family
  const groupFontsByFamily = (fonts: FontFile[]): FontFamily[] => {
    const familyMap = new Map<string, FontFamily>()
    
    fonts.forEach(font => {
      const familyName = font.family
      if (!familyMap.has(familyName)) {
        familyMap.set(familyName, {
          name: familyName,
          fonts: [],
          category: font.category,
          foundry: font.foundry,
          languages: [...font.languages],
          isVariable: font.isVariable,
          totalSize: 0,
          openTypeFeatures: [...font.openTypeFeatures]
        })
      }
      
      const family = familyMap.get(familyName)!
      family.fonts.push(font)
      family.totalSize += font.fileSize
      family.isVariable = family.isVariable || font.isVariable
      
      // Merge unique languages and features
      font.languages.forEach(lang => {
        if (!family.languages.includes(lang)) {
          family.languages.push(lang)
        }
      })
      
      font.openTypeFeatures.forEach(feature => {
        if (!family.openTypeFeatures.includes(feature)) {
          family.openTypeFeatures.push(feature)
        }
      })
    })
    
    return Array.from(familyMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Load fonts
  const loadFonts = async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts/list-v2')
      const data = await response.json()
      
      if (data.success && data.fonts) {
        setFonts(data.fonts)
        setFontFamilies(groupFontsByFamily(data.fonts))
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
      toast.error('Failed to load fonts')
    } finally {
      setIsLoadingFonts(false)
    }
  }

  useEffect(() => {
    loadFonts()
  }, [])

  const handleUpload = async (file: File) => {
    if (!file) return
    
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/fonts/upload-v2', {
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

  const handleFontUpdate = async (filename: string, updates: Partial<FontFile>) => {
    try {
      // Handle default style changes specially
      if (updates.defaultStyle !== undefined) {
        const font = fonts.find(f => f.filename === filename)
        if (font && updates.defaultStyle) {
          // Use the dedicated default style endpoint
          const response = await fetch('/api/fonts/default-style', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              familyName: font.family, 
              defaultFilename: filename 
            })
          })
          
          if (response.ok) {
            loadFonts()
            return
          } else {
            throw new Error('Default style update failed')
          }
        }
      }
      
      // Regular font updates
      const response = await fetch('/api/fonts/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename, updates })
      })
      
      if (response.ok) {
        loadFonts()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      throw error
    }
  }
  
  const handleFontDelete = async (fontFilename: string) => {
    const font = fonts.find(f => f.filename === fontFilename)
    if (!font) return
    
    if (!confirm(`Are you sure you want to permanently delete "${font.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/fonts/delete-v2?filename=${encodeURIComponent(fontFilename)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Font deleted successfully')
        loadFonts()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Delete failed:', response.status, errorData)
        toast.error(`Failed to delete font: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Network error'}`)
    }
  }
  
  const handleFamilyUpdate = async (familyName: string, updates: Partial<FontFamily>) => {
    try {
      const response = await fetch('/api/fonts/family/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ familyName, updates })
      })
      
      if (response.ok) {
        loadFonts()
      } else {
        throw new Error('Family update failed')
      }
    } catch (error) {
      throw error
    }
  }

  const handleFamilyDelete = async (familyName: string) => {
    const family = fontFamilies.find(f => f.name === familyName)
    if (!family) return
    
    if (!confirm(`Are you sure you want to permanently delete the entire "${familyName}" family with ${family.fonts.length} fonts? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/fonts/delete-family?family=${encodeURIComponent(familyName)}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Family "${familyName}" deleted successfully`)
        loadFonts()
      } else {
        toast.error(result.message || 'Failed to delete family')
      }
    } catch (error) {
      toast.error('Family deletion failed')
    }
  }
  
  const handleUploadToFamily = async (familyName: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('familyName', familyName)
    
    try {
      const response = await fetch('/api/fonts/upload-v2', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        loadFonts()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      throw error
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / (1024 * 1024)) + ' MB'
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-stone-950 text-stone-50' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Font Admin</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className="gap-2"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Light' : 'Dark'}
            </Button>
            
            {/* Upload Button */}
            <div>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                id="font-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />
              <Button
                onClick={() => document.getElementById('font-upload')?.click()}
                disabled={isLoading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isLoading ? 'Uploading...' : 'Upload Font'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
              {fonts.length}
            </div>
            <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
              Total Fonts
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
              {new Set(fonts.map(f => f.family)).size}
            </div>
            <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
              Font Families
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
              {Math.round(fonts.reduce((sum, f) => sum + f.fileSize, 0) / 1024)}
            </div>
            <div className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
              Total KB
            </div>
          </div>
        </div>

        {/* Font Families List */}
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
          <FontFamilyAccordion
            fontFamilies={fontFamilies}
            darkMode={darkMode}
            onFontUpdate={handleFontUpdate}
            onFontDelete={handleFontDelete}
            onFamilyUpdate={handleFamilyUpdate}
            onFamilyDelete={handleFamilyDelete}
            onUploadToFamily={handleUploadToFamily}
          />
        )}
      </div>
      
      <Toaster 
        position="top-center"
        richColors 
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  )
}