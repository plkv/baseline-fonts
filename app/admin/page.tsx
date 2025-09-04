"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun, Upload, Trash2 } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Badge } from "@/components/ui/badge"

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
}

export default function AdminPage() {
  const [fonts, setFonts] = useState<FontFile[]>([])
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

  // Load fonts
  const loadFonts = async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts/list')
      const data = await response.json()
      
      if (data.success && data.fonts) {
        setFonts(data.fonts)
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

  const handleDelete = async (fontFilename: string) => {
    const font = fonts.find(f => f.filename === fontFilename)
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

        {/* Font List */}
        {isLoadingFonts ? (
          <div className="text-center py-8">
            <div className={`text-lg ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
              Loading fonts...
            </div>
          </div>
        ) : fonts.length === 0 ? (
          <div className="text-center py-8">
            <div className={`text-lg ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
              No fonts uploaded yet. Upload your first font to get started.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fonts.map((font) => (
              <div
                key={font.filename}
                className={`p-6 rounded-lg border ${darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-stone-50' : 'text-gray-900'}`}>
                        {font.family}
                      </h3>
                      <Badge variant="outline">{font.style}</Badge>
                      <Badge variant="secondary">{font.weight}</Badge>
                      <Badge>{font.category}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>Format</div>
                        <div>{font.format.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>Size</div>
                        <div>{formatFileSize(font.fileSize)}</div>
                      </div>
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>Foundry</div>
                        <div>{font.foundry}</div>
                      </div>
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>Languages</div>
                        <div>{font.languages.slice(0, 2).join(', ')} {font.languages.length > 2 && `+${font.languages.length - 2}`}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                        OpenType Features
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {font.openTypeFeatures.slice(0, 5).map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {font.openTypeFeatures.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{font.openTypeFeatures.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(font.filename)}
                      className="gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Font Preview */}
                <div className="mt-4 pt-4 border-t border-stone-700">
                  <div 
                    className="text-2xl leading-relaxed"
                    style={{
                      fontFamily: font.url ? `"${font.family}", sans-serif` : 'sans-serif'
                    }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                  {font.url && (
                    <style>
                      {`@font-face {
                        font-family: "${font.family}";
                        src: url("${font.url}") format("${font.format === 'otf' ? 'opentype' : font.format}");
                        font-weight: ${font.weight};
                        font-style: normal;
                      }`}
                    </style>
                  )}
                </div>
              </div>
            ))}
          </div>
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