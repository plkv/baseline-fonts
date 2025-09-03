"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun, Eye, EyeOff, Trash2 } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Badge } from "@/components/ui/badge"

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [uploadedFonts, setUploadedFonts] = useState<any[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(false)

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

  // Load uploaded fonts
  const loadFonts = async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts/list')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.fonts) {
          setUploadedFonts(data.fonts)
        }
      }
    } catch (error) {
      toast.error('Failed to load fonts')
    } finally {
      setIsLoadingFonts(false)
    }
  }

  // Load fonts on component mount
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
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Font uploaded successfully!`, {
          description: `${result.font.family} - ${result.font.style} (${result.font.weight})`
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

  // Font management functions
  const handleRemoveFont = async (fontName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${fontName}"? This action cannot be undone.`)) {
      return
    }

    try {
      // For now, just remove from local state since we don't have delete API
      setUploadedFonts(prev => prev.filter(font => font.name !== fontName))
      toast.success('Font removed successfully')
    } catch (error) {
      toast.error('Failed to remove font')
    }
  }

  const handleTogglePublish = async (fontName: string, isPublished: boolean) => {
    try {
      // For now, just update local state
      setUploadedFonts(prev => 
        prev.map(font => 
          font.name === fontName 
            ? { ...font, published: !isPublished }
            : font
        )
      )
      toast.success(isPublished ? 'Font unpublished' : 'Font published')
    } catch (error) {
      toast.error('Failed to update font status')
    }
  }

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-stone-950' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`p-8 rounded-lg shadow ${darkMode ? 'bg-stone-900 border border-stone-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-stone-100' : 'bg-gray-900'}`}>
                <Shield className={`w-6 h-6 ${darkMode ? 'text-stone-900' : 'text-white'}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>Font Management Admin</h1>
                <p className={`${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>Upload and manage font files</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-md ${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-xs">{darkMode ? 'Dark' : 'Light'}</span>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>Upload Font</h2>
            <input
              type="file"
              accept=".ttf,.otf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              disabled={isLoading}
              className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold disabled:opacity-50 ${
                darkMode 
                  ? 'text-stone-400 file:bg-stone-800 file:text-stone-200 hover:file:bg-stone-700' 
                  : 'text-gray-500 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100'
              }`}
            />
            {isLoading && (
              <div className={`mt-2 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Uploading and processing font...</div>
            )}
          </div>
          
          <div className={`space-y-2 ${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>
            <p>• Upload TTF or OTF files to add them to the catalog</p>
            <p>• Font metadata is automatically extracted using OpenType.js</p>
            <p>• Uploaded fonts will appear on the main page</p>
          </div>

          {/* Font Management Table */}
          <div className="mt-12">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>
              Uploaded Fonts ({uploadedFonts.length})
            </h2>
            
            {isLoadingFonts ? (
              <div className={`text-center py-8 ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                Loading fonts...
              </div>
            ) : uploadedFonts.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                No fonts uploaded yet
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFonts.map((font) => {
                  const isPublished = font.published !== false // Default to published
                  return (
                    <div
                      key={font.name}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'bg-stone-800 border-stone-700' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className={`font-medium ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>
                            {font.family}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                              {font.styles} style{font.styles !== 1 ? 's' : ''}
                            </span>
                            <Badge variant={font.isVariable ? "default" : "secondary"} className="text-xs">
                              {font.isVariable ? 'Variable' : 'Static'}
                            </Badge>
                            <Badge variant={isPublished ? "default" : "outline"} className="text-xs">
                              {isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(font.name, isPublished)}
                          className={`${darkMode ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                          {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFont(font.name)}
                          className={`text-red-500 hover:text-red-700 hover:bg-red-50 ${
                            darkMode ? 'hover:bg-red-950/20' : 'hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster theme={darkMode ? 'dark' : 'light'} />
    </div>
  )
}