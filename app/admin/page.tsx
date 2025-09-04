"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun, Eye, EyeOff, Trash2, Edit2, Save, X } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [uploadedFonts, setUploadedFonts] = useState<any[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(false)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const [editingFont, setEditingFont] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

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

  // Inject font CSS when fonts are loaded
  useEffect(() => {
    // Clear any existing font styles
    const existingStyles = document.querySelectorAll('style[data-font-loader="admin"]')
    existingStyles.forEach(style => style.remove())

    // Create and inject CSS for each font
    uploadedFonts.forEach((font, index) => {
      if (!font.url) return

      const style = document.createElement('style')
      style.setAttribute('data-font-loader', 'admin')
      style.setAttribute('data-font-index', index.toString())
      
      // Create normalized font family name for CSS
      const normalizedName = font.family.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '')
      
      // Create CSS with proper font-face and selectors
      style.textContent = `
        @font-face {
          font-family: "${normalizedName}";
          src: url("${font.url}") format("${font.format === 'otf' ? 'opentype' : 'truetype'}");
          font-weight: ${font.weight || 400};
          font-style: normal;
          font-display: swap;
        }
        
        /* Also use original family name as fallback */
        @font-face {
          font-family: "${font.family}";
          src: url("${font.url}") format("${font.format === 'otf' ? 'opentype' : 'truetype'}");
          font-weight: ${font.weight || 400};
          font-style: normal;
          font-display: swap;
        }
        
        /* Ensure the preview uses the correct font */
        [data-font-family="${font.family}"] {
          font-family: "${normalizedName}", "${font.family}", monospace !important;
        }
      `
      
      document.head.appendChild(style)
      console.log(`📝 Injected CSS for ${font.family} (${normalizedName}) from ${font.url}`)
      
      // Check if font loads successfully with better error handling
      if ('fonts' in document) {
        try {
          const fontFace = new FontFace(normalizedName, `url("${font.url}")`, {
            weight: 'normal',
            style: 'normal'
          })
          fontFace.load().then(() => {
            setLoadedFonts(prev => new Set([...prev, font.family]))
            console.log(`✅ Font loaded successfully: ${font.family}`)
          }).catch((error) => {
            console.error(`❌ Failed to load font ${font.family}:`, error)
            console.error(`  Font details: style="${font.style}", weight="${font.weight}", foundry="${font.foundry}"`)
          })
        } catch (error) {
          console.error(`❌ FontFace creation failed for ${font.family}:`, error)
        }
      }
    })
  }, [uploadedFonts])

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
    const font = uploadedFonts.find(f => f.name === fontName)
    if (!font) return
    
    if (!confirm(`Are you sure you want to permanently delete "${fontName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/fonts/delete?filename=${encodeURIComponent(font.filename)}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUploadedFonts(prev => prev.filter(f => f.name !== fontName))
        toast.success('Font removed successfully')
      } else {
        const error = await response.json()
        toast.error('Failed to remove font', {
          description: error.error
        })
      }
    } catch (error) {
      toast.error('Failed to remove font')
    }
  }

  const handleTogglePublish = async (fontName: string, isPublished: boolean) => {
    const font = uploadedFonts.find(f => f.name === fontName)
    if (!font) return
    
    try {
      const response = await fetch('/api/fonts/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: font.filename,
          updates: { published: !isPublished }
        })
      })
      
      if (response.ok) {
        setUploadedFonts(prev => 
          prev.map(f => 
            f.name === fontName 
              ? { ...f, published: !isPublished }
              : f
          )
        )
        toast.success(isPublished ? 'Font unpublished' : 'Font published')
      } else {
        const error = await response.json()
        toast.error('Failed to update font status', {
          description: error.error
        })
      }
    } catch (error) {
      toast.error('Failed to update font status')
    }
  }

  const handleEditFont = (font: any) => {
    setEditingFont(font.filename)
    setEditFormData({
      family: font.family || '',
      foundry: font.foundry || '',
      category: font.category || 'Sans Serif',
      languages: font.languages ? font.languages.join(', ') : 'Latin',
      openTypeFeatures: font.openTypeFeatures ? font.openTypeFeatures.join(', ') : '',
      style: font.style || 'Regular',
      weight: font.weight || 400
    })
  }

  const handleCancelEdit = () => {
    setEditingFont(null)
    setEditFormData({})
  }

  const handleSaveEdit = async (font: any) => {
    try {
      const response = await fetch('/api/fonts/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: font.filename,
          updates: {
            family: editFormData.family,
            foundry: editFormData.foundry,
            category: editFormData.category,
            languages: editFormData.languages.split(',').map((l: string) => l.trim()),
            openTypeFeatures: editFormData.openTypeFeatures.split(',').map((f: string) => f.trim()),
            style: editFormData.style,
            weight: parseInt(editFormData.weight)
          }
        })
      })

      if (response.ok) {
        setUploadedFonts(prev =>
          prev.map(f =>
            f.filename === font.filename
              ? {
                  ...f,
                  family: editFormData.family,
                  foundry: editFormData.foundry,
                  category: editFormData.category,
                  languages: editFormData.languages.split(',').map((l: string) => l.trim()),
                  openTypeFeatures: editFormData.openTypeFeatures.split(',').map((f: string) => f.trim()),
                  style: editFormData.style,
                  weight: parseInt(editFormData.weight)
                }
              : f
          )
        )
        setEditingFont(null)
        setEditFormData({})
        toast.success('Font metadata updated successfully')
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
                      className={`p-6 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'bg-stone-800 border-stone-700' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Header with name and actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 mr-4">
                          {editingFont === font.filename ? (
                            <div className="space-y-2">
                              <Input
                                placeholder="Font Family"
                                value={editFormData.family}
                                onChange={(e) => setEditFormData({...editFormData, family: e.target.value})}
                                className="font-semibold"
                              />
                              <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>
                                {font.filename} • {(font.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          ) : (
                            <div>
                              <h3 className={`text-lg font-semibold ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>
                                {font.family}
                              </h3>
                              <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>
                                {font.filename} • {(font.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingFont === font.filename ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveEdit(font)}
                                className={`text-green-600 hover:text-green-700 ${darkMode ? 'hover:bg-green-950/20' : 'hover:bg-green-50'}`}
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className={`${darkMode ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditFont(font)}
                                className={`${darkMode ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </Button>
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
                            </>
                          )}
                        </div>
                      </div>

                      {/* Font Preview */}
                      <div className={`mb-4 p-4 rounded border ${darkMode ? 'bg-stone-900 border-stone-600' : 'bg-gray-50 border-gray-200'}`}>
                        {/* Enhanced font-face with better compatibility */}
                        <style>{`
                          @font-face {
                            font-family: "TestFont-${font.family.replace(/[^a-zA-Z0-9]/g, '')}";
                            src: url("${font.url}") format("${font.format === 'otf' ? 'opentype' : 'truetype'}"),
                                 url("${font.url}") format("truetype");
                            font-weight: normal;
                            font-style: normal;
                            font-display: swap;
                          }
                          @font-face {
                            font-family: "TestFont-${font.family.replace(/[^a-zA-Z0-9]/g, '')}-Fallback";
                            src: url("${font.url}");
                            font-weight: normal;
                            font-style: normal;
                            font-display: swap;
                          }
                        `}</style>
                        <div
                          style={{
                            fontFamily: `"TestFont-${font.family.replace(/[^a-zA-Z0-9]/g, '')}", "TestFont-${font.family.replace(/[^a-zA-Z0-9]/g, '')}-Fallback", "${font.family}", monospace`,
                            fontSize: '24px',
                            fontWeight: 'normal',
                            lineHeight: '1.2'
                          }}
                          className={`${darkMode ? 'text-stone-200' : 'text-gray-900'} mb-2`}
                        >
                          {font.family}: The quick brown fox jumps over the lazy dog
                        </div>
                        
                        {/* Alternative preview with different font loading approach */}
                        <div
                          style={{
                            fontFamily: `"${font.family}", monospace`,
                            fontSize: '18px',
                            fontWeight: 'normal',
                            lineHeight: '1.2'
                          }}
                          className={`${darkMode ? 'text-stone-400' : 'text-gray-600'} mb-2`}
                        >
                          Alternative: ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
                        </div>
                        
                        {/* Fallback test */}
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '16px'
                          }}
                          className={`${darkMode ? 'text-stone-400' : 'text-gray-600'}`}
                        >
                          Monospace fallback: The quick brown fox jumps over the lazy dog
                        </div>
                        
                        {/* Font URL Test & Debugging */}
                        <div className={`text-xs mt-2 p-2 border rounded ${darkMode ? 'bg-stone-800 border-stone-600' : 'bg-gray-100 border-gray-300'}`}>
                          <div className="mb-2">
                            <strong>Font URL Test:</strong> 
                            <a 
                              href={font.url} 
                              target="_blank" 
                              className="ml-1 text-blue-500 hover:underline"
                            >
                              {font.url}
                            </a>
                            {font.blobUrl && (
                              <>
                                <br /><strong>Blob URL:</strong> 
                                <a 
                                  href={font.blobUrl} 
                                  target="_blank" 
                                  className="ml-1 text-blue-500 hover:underline"
                                >
                                  {font.blobUrl}
                                </a>
                              </>
                            )}
                          </div>
                          <div className="text-xs space-y-1">
                            <div><strong>Original Name:</strong> "{font.family}"</div>
                            <div><strong>CSS Name:</strong> "TestFont-{font.family.replace(/[^a-zA-Z0-9]/g, '')}"</div>
                            <div><strong>Font Details:</strong> {font.format} | Weight: {font.weight} | Style: {font.style}</div>
                            <div><strong>Category:</strong> {font.category} | <strong>Size:</strong> {(font.fileSize / 1024).toFixed(1)}KB</div>
                            <div><strong>Storage:</strong> {font.storage || 'unknown'} | <strong>Uploaded:</strong> {font.uploadedAt ? new Date(font.uploadedAt).toLocaleString() : 'unknown'}</div>
                            <div><strong>Font API Status:</strong> {loadedFonts.has(font.family) ? '✅ Loaded' : '❌ Failed'}</div>
                            <div><strong>Preview Status:</strong> If previews look the same, the font isn't loading correctly</div>
                          </div>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Style & Weight
                          </label>
                          {editingFont === font.filename ? (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Style"
                                value={editFormData.style}
                                onChange={(e) => setEditFormData({...editFormData, style: e.target.value})}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Weight"
                                type="number"
                                value={editFormData.weight}
                                onChange={(e) => setEditFormData({...editFormData, weight: e.target.value})}
                                className="text-sm w-20"
                              />
                            </div>
                          ) : (
                            <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                              {font.style} • {font.weight}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Category
                          </label>
                          {editingFont === font.filename ? (
                            <Select value={editFormData.category} onValueChange={(value) => setEditFormData({...editFormData, category: value})}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sans Serif">Sans Serif</SelectItem>
                                <SelectItem value="Serif">Serif</SelectItem>
                                <SelectItem value="Monospace">Monospace</SelectItem>
                                <SelectItem value="Display">Display</SelectItem>
                                <SelectItem value="Script">Script</SelectItem>
                                <SelectItem value="Pixel">Pixel</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                              {font.category}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Foundry/Designer
                          </label>
                          {editingFont === font.filename ? (
                            <Input
                              placeholder="Foundry or Designer"
                              value={editFormData.foundry}
                              onChange={(e) => setEditFormData({...editFormData, foundry: e.target.value})}
                              className="text-sm"
                            />
                          ) : (
                            <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                              {font.foundry || 'Unknown'}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Languages
                          </label>
                          {editingFont === font.filename ? (
                            <Input
                              placeholder="e.g. Latin, Greek, Hebrew"
                              value={editFormData.languages}
                              onChange={(e) => setEditFormData({...editFormData, languages: e.target.value})}
                              className="text-sm"
                            />
                          ) : (
                            <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                              {font.languages ? font.languages.join(', ') : 'Latin'}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Format & Type
                          </label>
                          <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                            {font.format?.toUpperCase()} • {font.isVariable ? 'Variable' : 'Static'}
                          </p>
                        </div>

                        <div>
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} block mb-1`}>
                            Uploaded
                          </label>
                          <p className={`text-sm font-medium ${darkMode ? 'text-stone-200' : 'text-gray-800'}`}>
                            {font.uploadedAt ? new Date(font.uploadedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>

                      {/* OpenType Features */}
                      <div className="mb-4">
                        <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-2 block`}>
                          OpenType Features ({font.openTypeFeatures ? font.openTypeFeatures.length : 0})
                        </label>
                        {editingFont === font.filename ? (
                          <Textarea
                            placeholder="e.g. Standard Ligatures, Kerning, Small Capitals"
                            value={editFormData.openTypeFeatures}
                            onChange={(e) => setEditFormData({...editFormData, openTypeFeatures: e.target.value})}
                            className="text-sm"
                            rows={3}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {font.openTypeFeatures && font.openTypeFeatures.length > 0 ? (
                              <>
                                {font.openTypeFeatures.slice(0, 8).map((feature: string, index: number) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className={`text-xs ${darkMode ? 'border-stone-600 text-stone-300' : 'border-gray-300 text-gray-600'}`}
                                  >
                                    {feature}
                                  </Badge>
                                ))}
                                {font.openTypeFeatures.length > 8 && (
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${darkMode ? 'bg-stone-700 text-stone-300' : 'bg-gray-200 text-gray-600'}`}
                                  >
                                    +{font.openTypeFeatures.length - 8} more
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className={`text-sm ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                                No features detected
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Variable Axes */}
                      {font.variableAxes && font.variableAxes.length > 0 && (
                        <div className="mb-4">
                          <label className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'} mb-2 block`}>
                            Variable Axes ({font.variableAxes.length})
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {font.variableAxes.map((axis: any, index: number) => (
                              <Badge 
                                key={index} 
                                variant="default" 
                                className="text-xs"
                              >
                                {axis.name}: {axis.min}-{axis.max}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        <Badge variant={font.isVariable ? "default" : "secondary"} className="text-xs">
                          {font.isVariable ? 'Variable' : 'Static'}
                        </Badge>
                        <Badge variant={isPublished ? "default" : "outline"} className="text-xs">
                          {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {font.styles} style{font.styles !== 1 ? 's' : ''}
                        </Badge>
                        {font.features && (
                          <Badge variant="outline" className="text-xs">
                            {font.features.length} features
                          </Badge>
                        )}
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