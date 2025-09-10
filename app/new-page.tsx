"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Font, FontFamily, FilterState, FontCollection } from "@/lib/types"

const textPresets = {
  Names: (name: string) => name,
  Basic: () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789",
  Paragraph: () => "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  Custom: (custom: string) => custom
}

export default function FontCatalog() {
  // Data State
  const [fonts, setFonts] = useState<Font[]>([])
  const [families, setFamilies] = useState<FontFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    collection: 'Text',
    categories: [],
    tags: [],
    languages: [],
    weights: [],
    search: ''
  })
  
  // Display State
  const [viewMode, setViewMode] = useState<'fonts' | 'families'>('families')
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof textPresets>('Names')
  const [customText, setCustomText] = useState('')
  const [fontSize, setFontSize] = useState([48])
  
  // Load data
  useEffect(() => {
    loadFonts()
  }, [filters, viewMode])
  
  const loadFonts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      // Add filters to params
      if (filters.collection) params.set('collection', filters.collection)
      if (filters.categories?.length) params.set('categories', filters.categories.join(','))
      if (filters.tags?.length) params.set('tags', filters.tags.join(','))
      if (filters.languages?.length) params.set('languages', filters.languages.join(','))
      if (filters.weights?.length) params.set('weights', filters.weights.join(','))
      if (filters.search) params.set('search', filters.search)
      
      // Set return type
      if (viewMode === 'families') params.set('families', 'true')
      
      const response = await fetch(`/api/fonts?${params}`)
      const data = await response.json()
      
      if (data.success) {
        if (viewMode === 'families') {
          setFamilies(data.families || [])
        } else {
          setFonts(data.fonts || [])
        }
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getPreviewText = (fontName: string) => {
    const preset = textPresets[selectedPreset]
    if (selectedPreset === 'Custom') {
      return customText || fontName
    }
    return preset(fontName)
  }
  
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  // Font loading helper
  const loadFont = (font: Font) => {
    const fontKey = `${font.family}-${font.id}`
    if (loadedFonts.has(fontKey)) return
    
    const fontFace = new FontFace(font.family, `url(${font.blob})`)
    fontFace.load().then(() => {
      document.fonts.add(fontFace)
      setLoadedFonts(prev => new Set(prev).add(fontKey))
    }).catch(err => {
      console.warn(`Failed to load font ${font.family}:`, err)
    })
  }
  
  // Load fonts when data changes
  useEffect(() => {
    if (viewMode === 'families') {
      families.forEach(family => {
        family.fonts.forEach(font => loadFont(font))
      })
    } else {
      fonts.forEach(font => loadFont(font))
    }
  }, [fonts, families, viewMode])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Baseline Fonts</h1>
            <div className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : 
                viewMode === 'families' ? 
                  `${families.length} font families` : 
                  `${fonts.length} fonts`
              }
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          
          {/* Filters Sidebar */}
          <div className="space-y-6">
            
            {/* Collection Selector */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Collection</h3>
                <Tabs 
                  value={filters.collection} 
                  onValueChange={(value: FontCollection) => updateFilter('collection', value)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="Text">Text</TabsTrigger>
                    <TabsTrigger value="Display">Display</TabsTrigger>
                    <TabsTrigger value="Weirdo">Weirdo</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* View Mode */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">View</h3>
                <Tabs value={viewMode} onValueChange={(value: 'fonts' | 'families') => setViewMode(value)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="families">Families</TabsTrigger>
                    <TabsTrigger value="fonts">Individual</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Text Controls */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Preview Text</h3>
                <Select 
                  value={selectedPreset} 
                  onValueChange={(value: keyof typeof textPresets) => setSelectedPreset(value)}
                >
                  <SelectTrigger className="mb-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(textPresets).map(preset => (
                      <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedPreset === 'Custom' && (
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Enter custom text..."
                    className="w-full px-3 py-2 border rounded-md"
                  />
                )}
                
                <div className="mt-4">
                  <label className="text-sm font-medium">Font Size: {fontSize[0]}px</label>
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    max={100}
                    min={12}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Font Grid */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-lg">Loading fonts...</div>
              </div>
            ) : (
              <div className="grid gap-4">
                {viewMode === 'families' ? (
                  // Family View
                  families.map((family) => (
                    <Card key={family.name} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">{family.name}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{family.collection}</Badge>
                            <Badge variant="secondary">{family.fonts.length} styles</Badge>
                          </div>
                        </div>
                        {family.fonts[0]?.downloadUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={family.fonts[0].downloadUrl} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                      
                      {/* Preview */}
                      <div 
                        className="text-preview mb-4"
                        style={{ 
                          fontFamily: `"${family.name}"`, 
                          fontSize: `${fontSize[0]}px`,
                          lineHeight: 1.2
                        }}
                      >
                        {getPreviewText(family.name)}
                      </div>
                      
                      {/* Font Variants */}
                      <div className="flex flex-wrap gap-2">
                        {family.fonts.map((font) => (
                          <Badge key={font.id} variant="outline" className="text-xs">
                            {font.weight} {font.style}
                            {font.isVariable && " (Variable)"}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Tags */}
                      {family.fonts[0]?.tags && family.fonts[0].tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {family.fonts[0].tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  // Individual Font View
                  fonts.map((font) => (
                    <Card key={font.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">{font.name}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{font.collection}</Badge>
                            <Badge variant="secondary">{font.weight} {font.style}</Badge>
                            {font.isVariable && <Badge variant="secondary">Variable</Badge>}
                          </div>
                        </div>
                        {font.downloadUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={font.downloadUrl} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                      
                      {/* Preview */}
                      <div 
                        className="text-preview mb-4"
                        style={{ 
                          fontFamily: `"${font.family}"`, 
                          fontSize: `${fontSize[0]}px`,
                          fontWeight: font.weight,
                          lineHeight: 1.2
                        }}
                      >
                        {getPreviewText(font.name)}
                      </div>
                      
                      {/* Variable Axes */}
                      {font.isVariable && font.variableAxes && font.variableAxes.length > 0 && (
                        <div className="space-y-3 mb-4 p-3 bg-muted rounded-md">
                          <h4 className="text-sm font-medium">Variable Axes</h4>
                          {font.variableAxes.map((axis) => (
                            <div key={axis.tag}>
                              <label className="text-xs text-muted-foreground">
                                {axis.name} ({axis.tag}): {axis.default}
                              </label>
                              <Slider
                                defaultValue={[axis.default]}
                                max={axis.max}
                                min={axis.min}
                                step={1}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Tags */}
                      {font.tags && font.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {font.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}