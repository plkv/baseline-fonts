"use client"

import { useState, useEffect, useCallback } from "react"
import { Slider } from "@/components/ui/slider"

// Font interface for our API data
interface FontData {
  id: number
  name: string
  family: string
  style: string
  category: string
  styles: number
  type: "Variable" | "Static"
  author: string
  fontFamily: string
  availableWeights: number[]
  hasItalic: boolean
  filename: string
  url?: string
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures?: string[]
  _familyFonts?: any[] // Store original font data for style selection
  _availableStyles?: Array<{
    weight: number
    styleName: string
    isItalic: boolean
    font?: any // Reference to original font for static fonts
  }> // Structured style data for style selection
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
}

const textPresets = ["Names", "Key Glyphs", "Basic", "Paragraph", "Brands"]
// Languages will be dynamically generated from current collection
const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]

const getPresetContent = (preset: string, fontName: string) => {
  switch (preset) {
    case "Names":
      return fontName
    case "Key Glyphs":
      return 'RKFJIGCQ aueoyrgsltf\n0123469 €£¥©®™…–—\n≪"(@&?;-> αβγδ ñüß çéà\nЯ中文한글العربية'
    case "Basic":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789\n!@#$%^&*()_+-=[]{}|;':\",./<>?"
    case "Paragraph":
      return "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo."
    case "Brands":
      const brands = [
        "Apple",
        "Google",
        "Microsoft",
        "Meta",
        "Tesla",
        "Netflix",
        "Spotify",
        "Adobe",
        "Nike",
        "Adidas",
        "Gucci",
        "Prada",
        "Louis Vuitton",
        "Chanel",
        "Hermès",
        "Versace",
      ]
      return brands
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
        .join(" • ")
    default:
      return fontName
  }
}

export default function FontLibrary() {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Font Data State  
  const [fonts, setFonts] = useState<FontData[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(true)
  const [customText, setCustomText] = useState("")
  const [displayMode, setDisplayMode] = useState<"Text" | "Display" | "Weirdo">("Text")
  const [selectedPreset, setSelectedPreset] = useState("Names")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedWeights, setSelectedWeights] = useState<number[]>([])
  const [isItalic, setIsItalic] = useState(false)
  const [fontWeightSelections, setFontWeightSelections] = useState<Record<number, { weight: number; italic: boolean }>>(
    {},
  )
  const [textSize, setTextSize] = useState([72])
  const [lineHeight, setLineHeight] = useState([120])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [sortBy, setSortBy] = useState("Date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc") // New = desc, Old = asc
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [fontOTFeatures, setFontOTFeatures] = useState<Record<number, Record<string, boolean>>>({})
  const [fontVariableAxes, setFontVariableAxes] = useState<Record<number, Record<string, number>>>({})

  const [editingElementRef, setEditingElementRef] = useState<HTMLDivElement | null>(null)

  // Load fonts from our API
  const loadFonts = useCallback(async () => {
    try {
      setIsLoadingFonts(true)
      console.log('🔄 Loading fonts from API...')
      const response = await fetch('/api/fonts-clean/list')
      if (response.ok) {
        const data = await response.json()
        console.log('📋 API Response:', data)
        if (data.success && data.fonts) {
          // Group fonts by family name to avoid duplicates
          const fontsByFamily = new Map<string, any[]>()
          data.fonts.forEach((font: any) => {
            const familyName = font.family || font.name
            if (!fontsByFamily.has(familyName)) {
              fontsByFamily.set(familyName, [])
            }
            fontsByFamily.get(familyName)!.push(font)
          })

          // Transform grouped families to catalog UI format
          const catalogFonts: FontData[] = Array.from(fontsByFamily.entries()).map(([familyName, familyFonts], index) => {
            // Choose the best representative font: 
            // 1. Font marked as default style
            // 2. Non-italic font (regular/normal)
            // 3. First font as fallback
            const representativeFont = familyFonts.find(f => f.isDefaultStyle) ||
              familyFonts.find(f => !f.style?.toLowerCase().includes('italic') && !f.style?.toLowerCase().includes('oblique')) ||
              familyFonts[0]
            
            // Analyze available weight+style combinations
            const regularFonts = familyFonts.filter(f => !f.style?.toLowerCase().includes('italic'))
            const italicFonts = familyFonts.filter(f => f.style?.toLowerCase().includes('italic'))
            const hasItalic = italicFonts.length > 0
            const isVariable = familyFonts.some(f => f.isVariable)
            
            // Calculate available weights and styles for both variable and static fonts
            let availableWeights
            let availableStylesWithWeights = []
            
            if (isVariable) {
              // For variable fonts, use weight axis range or common weight stops
              const weightAxes = familyFonts
                .filter(f => f.variableAxes?.some(axis => axis.axis === 'wght'))
                .map(f => f.variableAxes?.find(axis => axis.axis === 'wght'))
                .filter(Boolean)
              
              if (weightAxes.length > 0) {
                // Use weight range from variable axis
                const minWeight = Math.min(...weightAxes.map(axis => axis.min))
                const maxWeight = Math.max(...weightAxes.map(axis => axis.max))
                // Common weight stops within the range
                availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
                  .filter(w => w >= minWeight && w <= maxWeight)
              } else {
                // Fallback for variable fonts without clear weight axis
                availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
              }
              
              // For variable fonts, generate style names from weights
              availableStylesWithWeights = availableWeights.map(weight => ({
                weight,
                styleName: getStyleNameFromWeight(weight, false),
                isItalic: false
              }))
              
              // Add italic variants if any font in family has italic capability
              if (hasItalic) {
                const italicStyles = availableWeights.map(weight => ({
                  weight,
                  styleName: getStyleNameFromWeight(weight, true),
                  isItalic: true
                }))
                availableStylesWithWeights = [...availableStylesWithWeights, ...italicStyles]
              }
            } else {
              // For static fonts, use actual font styles and weights
              const allFontStyles = familyFonts.map(font => ({
                weight: font.weight || 400,
                styleName: font.style || 'Regular',
                isItalic: font.style?.toLowerCase().includes('italic') || font.style?.toLowerCase().includes('oblique') || false,
                font: font // Store reference to original font
              }))
              
              // Sort by weight, then by italic (regular first)
              availableStylesWithWeights = allFontStyles.sort((a, b) => {
                if (a.weight !== b.weight) return a.weight - b.weight
                return a.isItalic ? 1 : -1 // Regular before italic
              })
              
              // Extract unique weights in correct order
              availableWeights = [...new Set(allFontStyles.map(style => style.weight))].sort((a, b) => a - b)
            }
            
            const finalType = isVariable ? "Variable" : "Static"
            
            return {
              id: index + 1,
              name: familyName,
              family: familyName,
              style: `${familyFonts.length} style${familyFonts.length !== 1 ? 's' : ''}`,
              category: Array.isArray(representativeFont.category) 
                ? representativeFont.category[0] || "Sans" // Use first category for UI compatibility
                : (representativeFont.category || "Sans"),
              styles: familyFonts.length,
              type: finalType,
              author: representativeFont.foundry || "Unknown",
              fontFamily: `"${familyName}", system-ui, sans-serif`,
              availableWeights: availableWeights,
              hasItalic: hasItalic,
              filename: representativeFont.filename,
              url: representativeFont.url || representativeFont.blobUrl,
              variableAxes: representativeFont.variableAxes,
              openTypeFeatures: representativeFont.openTypeFeatures,
              // Store family fonts data for style selection
              _familyFonts: familyFonts,
              // Store structured style data for proper style selection
              _availableStyles: availableStylesWithWeights,
              // Add collection and style tags for filtering
              collection: representativeFont.collection || 'Text',
              styleTags: representativeFont.styleTags || [],
              categories: Array.isArray(representativeFont.category) ? representativeFont.category : [representativeFont.category || "Sans"]
            }
          })
          setFonts(catalogFonts)
          console.log(`📝 Loaded ${catalogFonts.length} font families for catalog (${data.fonts.length} total font files)`)
          
          // Load CSS for all fonts
          loadFontCSS(catalogFonts)
        }
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
    } finally {
      setIsLoadingFonts(false)
    }
  }, [])

  // Load font CSS dynamically
  const loadFontCSS = useCallback((fonts: FontData[]) => {
    // Remove existing font styles
    const existingStyles = document.querySelectorAll('style[data-font-css]')
    existingStyles.forEach(style => style.remove())

    // Generate CSS for each font - handle multiple files per family
    const fontCSS = fonts.map(font => {
      if (font._familyFonts && font._familyFonts.length > 1) {
        // For families with multiple files, create @font-face for each file
        return font._familyFonts.map((fontFile: any) => {
          const isItalic = fontFile.style?.toLowerCase().includes('italic') || fontFile.style?.toLowerCase().includes('oblique')
          const fontWeight = fontFile.weight || 400
          
          return `
            @font-face {
              font-family: "${font.family}";
              src: url("${fontFile.url || fontFile.blobUrl || `/fonts/${fontFile.filename}`}");
              font-weight: ${fontWeight};
              font-style: ${isItalic ? 'italic' : 'normal'};
              font-display: swap;
            }`
        }).join('\n')
      } else {
        // Single font file
        const isItalic = font.style?.includes('italic') || font.style?.includes('oblique')
        return `
          @font-face {
            font-family: "${font.family}";
            src: url("${font.url || `/fonts/${font.filename}`}");
            font-weight: ${font.availableWeights?.[0] || 400};
            font-style: ${isItalic ? 'italic' : 'normal'};
            font-display: swap;
          }`
      }
    }).join('\n')

    // Inject CSS
    if (fontCSS) {
      const styleElement = document.createElement('style')
      styleElement.setAttribute('data-font-css', 'true')
      styleElement.textContent = fontCSS
      document.head.appendChild(styleElement)
    }
  }, [])

  // Helper function to get stylistic alternates from font's OpenType features
  const getStyleAlternates = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Get all OpenType features from family fonts and filter for stylistic alternates
    const allFeatures = new Set<string>()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.openTypeFeatures) {
        familyFont.openTypeFeatures.forEach((feature: string) => {
          // Look for stylistic sets (ss01, ss02, etc.) and stylistic alternates
          if (feature.toLowerCase().includes('stylistic set') || 
              feature.toLowerCase().includes('stylistic alternates') ||
              /^ss\d+$/.test(feature.toLowerCase())) {
            // Convert readable names to OpenType tags
            if (feature.toLowerCase().includes('stylistic set 1')) allFeatures.add('ss01')
            else if (feature.toLowerCase().includes('stylistic set 2')) allFeatures.add('ss02')
            else if (feature.toLowerCase().includes('stylistic set 3')) allFeatures.add('ss03')
            else if (feature.toLowerCase().includes('stylistic set 4')) allFeatures.add('ss04')
            else if (feature.toLowerCase().includes('stylistic set 5')) allFeatures.add('ss05')
            else if (feature.toLowerCase().includes('stylistic set 6')) allFeatures.add('ss06')
            else if (feature.toLowerCase().includes('stylistic set 7')) allFeatures.add('ss07')
            else if (feature.toLowerCase().includes('stylistic set 8')) allFeatures.add('ss08')
            else if (feature.toLowerCase().includes('stylistic alternates')) allFeatures.add('salt')
            else if (/^ss\d+$/.test(feature.toLowerCase())) allFeatures.add(feature.toLowerCase())
          }
        })
      }
    })
    
    return Array.from(allFeatures).sort()
  }

  // Helper function to get other OpenType features (non-stylistic)
  const getOtherOTFeatures = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Mapping from readable feature names to OpenType tags
    const featureMapping: Record<string, string> = {
      'standard ligatures': 'liga',
      'discretionary ligatures': 'dlig',
      'contextual ligatures': 'clig',
      'kerning': 'kern',
      'fractions': 'frac',
      'ordinals': 'ordn',
      'superscript': 'sups',
      'subscript': 'subs',
      'small capitals': 'smcp',
      'all small caps': 'c2sc',
      'case-sensitive forms': 'case',
      'slashed zero': 'zero',
      'tabular nums': 'tnum',
      'proportional nums': 'pnum',
      'lining figures': 'lnum',
      'oldstyle figures': 'onum'
    }
    
    const allFeatures = new Set<string>()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.openTypeFeatures) {
        familyFont.openTypeFeatures.forEach((feature: string) => {
          const lowerFeature = feature.toLowerCase()
          // Skip stylistic features (handled separately)
          if (!lowerFeature.includes('stylistic')) {
            const otTag = featureMapping[lowerFeature]
            if (otTag) {
              allFeatures.add(otTag)
            }
          }
        })
      }
    })
    
    return Array.from(allFeatures).sort()
  }

  const getVariableAxes = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Get variable axes from font metadata
    const allAxes = new Map()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.variableAxes) {
        familyFont.variableAxes.forEach((axis: any) => {
          // Use axis tag as key to avoid duplicates
          allAxes.set(axis.axis, {
            tag: axis.axis,
            name: axis.name,
            min: axis.min,
            max: axis.max,
            default: axis.default
          })
        })
      }
    })
    
    return Array.from(allAxes.values())
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  const toggleWeight = (weight: number) => {
    setSelectedWeights((prev) => (prev.includes(weight) ? prev.filter((w) => w !== weight) : [...prev, weight]))
  }

  const updateFontSelection = (fontId: number, weight: number, italic: boolean) => {
    console.log(`Updating font selection for ${fontId}: weight=${weight}, italic=${italic}`);
    setFontWeightSelections((prev) => ({
      ...prev,
      [fontId]: { weight, italic },
    }))
  }

  const handleSort = (sortType: "Date" | "Alphabetical") => {
    if (sortBy === sortType) {
      // Toggle direction if same sort type
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new sort type with default direction
      setSortBy(sortType)
      setSortDirection(sortType === "Date" ? "desc" : "asc") // Date defaults to desc (New), Alphabetical to asc (A-Z)
    }
  }

  const getFilteredFonts = () => {
    const filtered = fonts.filter((font) => {
      // Filter by collection (displayMode) - each tab should only show fonts from that collection
      const fontCollection = font.collection || 'Text' // Default to 'Text' if no collection set
      
      if (fontCollection !== displayMode) {
        return false
      }
      
      // Filter by selected categories
      if (selectedCategories.length > 0) {
        const hasMatchingCategory = selectedCategories.some(cat => 
          font.categories.includes(cat)
        )
        if (!hasMatchingCategory) return false
      }
      
      // Filter by selected style tags (appearance)
      if (selectedStyles.length > 0) {
        const hasMatchingStyle = selectedStyles.some(style => 
          font.styleTags.includes(style)
        )
        if (!hasMatchingStyle) return false
      }
      
      // Filter by selected languages
      if (selectedLanguages.length > 0) {
        const hasMatchingLanguage = selectedLanguages.some(lang => 
          font.languages && font.languages.includes(lang)
        )
        if (!hasMatchingLanguage) return false
      }
      
      // Filter by weights and italic (existing logic)
      if (selectedWeights.length === 0 && !isItalic) return true

      if (selectedWeights.length === 0 && isItalic) {
        return font.hasItalic
      }

      if (selectedWeights.length > 0) {
        const hasSelectedWeight = selectedWeights.some((weight) => font.availableWeights.includes(weight))

        if (isItalic) {
          return hasSelectedWeight && font.hasItalic
        }

        return hasSelectedWeight
      }

      return true
    })

    // Apply sorting based on sortBy and sortDirection
    return filtered.sort((a, b) => {
      let result = 0
      
      if (sortBy === "Alphabetical") {
        // Enhanced alphabetical sorting with numbers and symbols at the top
        result = a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base',
          ignorePunctuation: false 
        })
      } else {
        // Date sorting - use family representative font's upload date
        const aDate = a._familyFonts?.[0]?.uploadedAt ? new Date(a._familyFonts[0].uploadedAt).getTime() : 0
        const bDate = b._familyFonts?.[0]?.uploadedAt ? new Date(b._familyFonts[0].uploadedAt).getTime() : 0
        result = aDate - bDate // Default ascending (oldest first)
      }
      
      // Apply direction (flip result for descending)
      return sortDirection === "desc" ? -result : result
    })
  }

  const resetFilters = () => {
    setCustomText("")
    setDisplayMode("Text")
    setSelectedPreset("Names")
    setSelectedCategories([])
    setSelectedStyles([])
    setSelectedLanguages([])
    setSelectedWeights([])
    setIsItalic(false)
    setFontWeightSelections({})
    setTextSize([72])
    setLineHeight([120])
    setExpandedCards(new Set())
    setFontOTFeatures({})
    setFontVariableAxes({})
  }

  const getPreviewContent = (fontName: string) => {
    if (customText.trim()) {
      return customText
    }
    return getPresetContent(selectedPreset, fontName)
  }

  // Get all available style tags from fonts in current collection only
  const getAvailableStyleTags = () => {
    const allTags = new Set<string>()
    fonts.forEach(font => {
      // Only include tags from fonts in the current collection
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode) {
        font.styleTags.forEach(tag => allTags.add(tag))
      }
    })
    return Array.from(allTags).sort()
  }

  // Get dynamic categories based on fonts actually present in current collection
  const getCollectionCategories = () => {
    // Get all categories from fonts in the current collection
    const actualCategories = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode && font.categories) {
        font.categories.forEach(category => actualCategories.add(category))
      }
    })
    
    // Define the ideal order for each collection
    const categoryOrder = {
      Text: ['Sans', 'Serif', 'Slab', 'Mono'],
      Display: ['Sans-based', 'Serif-based', 'Fatface', 'Script', 'Handwritten', 'Pixel', 'Vintage', 'Stencil'],
      Weirdo: ['Experimental', 'Symbol', 'Bitmap', 'Decorative', 'Artistic', 'Conceptual']
    }
    
    const preferredOrder = categoryOrder[displayMode] || categoryOrder.Text
    
    // Return categories in preferred order, but only those that actually exist
    const orderedCategories = preferredOrder.filter(cat => actualCategories.has(cat))
    
    // Add any remaining categories that exist but aren't in the preferred order
    const remainingCategories = Array.from(actualCategories)
      .filter(cat => !preferredOrder.includes(cat))
      .sort()
    
    return [...orderedCategories, ...remainingCategories]
  }

  const getCollectionLanguages = () => {
    // Get all languages from fonts in the current collection
    const actualLanguages = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode && font.languages) {
        font.languages.forEach(language => actualLanguages.add(language))
      }
    })
    
    console.log(`Languages in ${displayMode} collection:`, Array.from(actualLanguages));
    
    // Define preferred order for common languages
    const languageOrder = ['Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Georgian']
    
    // Return languages in preferred order, but only those that actually exist
    const orderedLanguages = languageOrder.filter(lang => actualLanguages.has(lang))
    
    // Add any remaining languages that exist but aren't in the preferred order
    const remainingLanguages = Array.from(actualLanguages)
      .filter(lang => !languageOrder.includes(lang))
      .sort()
    
    const result = [...orderedLanguages, ...remainingLanguages];
    console.log(`Final language result for ${displayMode}:`, result);
    return result;
  }

  // Helper function to convert weight number to style name
  const getStyleNameFromWeight = (weight: number, isItalic: boolean): string => {
    let styleName = 'Regular'
    
    if (weight <= 150) styleName = 'Thin'
    else if (weight <= 250) styleName = 'ExtraLight'
    else if (weight <= 350) styleName = 'Light'
    else if (weight <= 450) styleName = 'Regular'
    else if (weight <= 550) styleName = 'Medium'
    else if (weight <= 650) styleName = 'SemiBold'
    else if (weight <= 750) styleName = 'Bold'
    else if (weight <= 850) styleName = 'ExtraBold'
    else styleName = 'Black'
    
    return isItalic ? `${styleName} Italic` : styleName
  }

  // Clean up filters when switching collections - remove invalid categories/styles
  const cleanFiltersForCollection = (newDisplayMode: "Text" | "Display" | "Weirdo") => {
    // Temporarily set displayMode to get correct categories/styles for the new collection
    const originalDisplayMode = displayMode
    
    // Get what categories and styles would be available in the new collection
    const newCollectionCategories = new Set<string>()
    const newCollectionStyles = new Set<string>()
    const newCollectionLanguages = new Set<string>()
    
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === newDisplayMode) {
        if (font.categories) {
          font.categories.forEach(category => newCollectionCategories.add(category))
        }
        font.styleTags.forEach(tag => newCollectionStyles.add(tag))
        if (font.languages) {
          font.languages.forEach(language => newCollectionLanguages.add(language))
        }
      }
    })
    
    // Remove selected categories that don't exist in new collection
    const validSelectedCategories = selectedCategories.filter(cat => newCollectionCategories.has(cat))
    if (validSelectedCategories.length !== selectedCategories.length) {
      setSelectedCategories(validSelectedCategories)
    }
    
    // Remove selected styles that don't exist in new collection  
    const validSelectedStyles = selectedStyles.filter(style => newCollectionStyles.has(style))
    if (validSelectedStyles.length !== selectedStyles.length) {
      setSelectedStyles(validSelectedStyles)
    }

    // Remove selected languages that don't exist in new collection
    const validSelectedLanguages = selectedLanguages.filter(lang => newCollectionLanguages.has(lang))
    if (validSelectedLanguages.length !== selectedLanguages.length) {
      setSelectedLanguages(validSelectedLanguages)
    }
  }

  // Post-render font fallback detection using DOM and canvas measurement
  useEffect(() => {
    const detectAndHighlightFallbackChars = () => {
      // Find all contentEditable preview divs
      const previewDivs = document.querySelectorAll('div[contenteditable="true"]')
      
      previewDivs.forEach((div) => {
        const element = div as HTMLElement
        const fontFamily = element.style.fontFamily
        if (!fontFamily) return

        // Create canvas for measurement
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const fontSize = 20 // Match approximate preview size
        const originalText = element.textContent || ''
        
        // Check each character to build fallback map
        const uniqueChars = [...new Set(originalText.split(''))]
        const fallbackChars = new Set<string>()
        
        for (const char of uniqueChars) {
          // Skip basic Latin characters and whitespace
          if (/^[a-zA-Z0-9\s\.,!?;:'"-]$/.test(char)) continue
          
          try {
            // Measure with intended font
            ctx.font = `${fontSize}px ${fontFamily}`
            const intendedWidth = ctx.measureText(char).width
            
            // Measure with fallback only
            ctx.font = `${fontSize}px sans-serif`  
            const fallbackWidth = ctx.measureText(char).width
            
            // If widths are very close, likely using fallback
            if (Math.abs(intendedWidth - fallbackWidth) < 1) {
              fallbackChars.add(char)
            }
          } catch (error) {
            continue
          }
        }
        
        // Only proceed if we have fallback characters
        if (fallbackChars.size === 0) {
          // Clean up any existing highlighting
          element.innerHTML = originalText
          return
        }
        
        // Create highlighted HTML by wrapping fallback characters
        let highlightedHTML = originalText
        
        for (const char of fallbackChars) {
          const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escapedChar, 'g')
          highlightedHTML = highlightedHTML.replace(
            regex,
            `<span class="fallback-char" style="opacity: 0.4; color: var(--gray-cont-tert);">${char}</span>`
          )
        }
        
        // Only update if content actually changed and element is not currently focused
        if (highlightedHTML !== originalText && highlightedHTML !== element.innerHTML && document.activeElement !== element) {
          element.innerHTML = highlightedHTML
        }
      })
    }
    
    // Run detection after fonts load and on text changes
    const timer = setTimeout(detectAndHighlightFallbackChars, 100)
    return () => clearTimeout(timer)
  }, [fonts, customText])

  // Placeholder function - now handled by useEffect
  const highlightMissingCharacters = (text: string, fontId: number) => {
    return text
  }

  const handlePreviewEdit = (element: HTMLDivElement, newText: string) => {
    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)
    const cursorOffset = range?.startOffset || 0

    setCustomText(newText)

    requestAnimationFrame(() => {
      if (element && selection) {
        try {
          const textNode = element.firstChild
          if (textNode) {
            const newRange = document.createRange()
            const safeOffset = Math.min(cursorOffset, textNode.textContent?.length || 0)
            newRange.setStart(textNode, safeOffset)
            newRange.setEnd(textNode, safeOffset)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        } catch (error) {
          element.focus()
        }
      }
    })
  }

  const toggleCardExpansion = (fontId: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fontId)) {
        newSet.delete(fontId)
      } else {
        newSet.add(fontId)
      }
      return newSet
    })
  }

  const toggleOTFeature = (fontId: number, feature: string) => {
    setFontOTFeatures((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [feature]: !prev[fontId]?.[feature],
      },
    }))
  }

  const updateVariableAxis = (fontId: number, axis: string, value: number) => {
    setFontVariableAxes((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [axis]: value,
      },
    }))
  }

  const getEffectiveStyle = (fontId: number) => {
    const fontSelection = fontWeightSelections[fontId] || { weight: 400, italic: false }
    const variableAxes = fontVariableAxes[fontId] || {}
    const otFeatures = fontOTFeatures[fontId] || {}

    // If sidebar has weight/italic selections, use those for preview
    if (selectedWeights.length > 0 || isItalic) {
      const result = {
        weight: selectedWeights.length > 0 ? selectedWeights[0] : variableAxes.wght || fontSelection.weight,
        italic: isItalic || fontSelection.italic,
        variableAxes,
        otFeatures,
      }
      console.log(`Effective style (global) for font ${fontId}:`, result);
      return result;
    }

    // Otherwise use individual font selection
    const result = {
      weight: variableAxes.wght || fontSelection.weight,
      italic: fontSelection.italic,
      variableAxes,
      otFeatures,
    }
    console.log(`Effective style (individual) for font ${fontId}:`, result);
    return result;
  }

  const getFontFeatureSettings = (otFeatures: Record<string, boolean>) => {
    const activeFeatures = Object.entries(otFeatures)
      .filter(([_, active]) => active)
      .map(([feature, _]) => `"${feature}" 1`)

    if (activeFeatures.length === 0) return undefined
    return activeFeatures.join(", ")
  }

  const getFontVariationSettings = (variableAxes: Record<string, number>) => {
    const axisSettings = Object.entries(variableAxes).map(([axis, value]) => `"${axis}" ${value}`)

    if (axisSettings.length === 0) return undefined
    return axisSettings.join(", ")
  }

  // Load fonts on mount
  useEffect(() => {
    loadFonts()
  }, [loadFonts])

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--gray-surface-prim)" }}>
      {/* Dynamic font loading and fallback character styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .fallback-char {
            opacity: 0.4 !important;
            color: var(--gray-cont-tert) !important;
          }
          ${fonts.map(font => {
            const familyName = font.name; // Use clean family name without quotes
            
            // For static fonts with multiple styles, generate @font-face for each style
            if (font._familyFonts && font._familyFonts.length > 1 && font.type === "Static") {
              return font._familyFonts.map((fontFile: any) => {
                console.log(`CSS for ${familyName} ${fontFile.style}: weight=${fontFile.weight}, italic=${fontFile.style?.toLowerCase().includes('italic')}`);
                return `
                @font-face {
                  font-family: "${familyName}";
                  src: url("${fontFile.blobUrl || fontFile.url}");
                  font-weight: ${fontFile.weight || 400};
                  font-style: ${fontFile.style?.toLowerCase().includes('italic') || fontFile.style?.toLowerCase().includes('oblique') ? 'italic' : 'normal'};
                  font-display: swap;
                }
              `}).join('')
            } else if (font.type === "Variable" && font._familyFonts) {
              // For variable fonts, generate @font-face rules for each file
              return font._familyFonts.map((fontFile: any) => {
                const weightRange = fontFile.variableAxes?.find((axis: any) => axis.axis === 'wght');
                const weightValue = weightRange ? `${weightRange.min} ${weightRange.max}` : '100 900';
                const isItalic = fontFile.style?.toLowerCase().includes('italic') || fontFile.style?.toLowerCase().includes('oblique');
                console.log(`Variable CSS for ${familyName} ${fontFile.style}: weight=${weightValue}, italic=${isItalic}, file=${fontFile.blobUrl || fontFile.url}`);
                return `
                @font-face {
                  font-family: "${familyName}";
                  src: url("${fontFile.blobUrl || fontFile.url}");
                  font-weight: ${weightValue};
                  font-style: ${isItalic ? 'italic' : 'normal'};
                  font-display: swap;
                }
              `}).join('')
            } else {
              // Single font fallback
              return `
                @font-face {
                  font-family: "${familyName}";
                  src: url("${font.url}");
                  font-display: swap;
                }
              `
            }
          }).join('')}
        `
      }} />
      {sidebarOpen && (
        <aside
          className="w-[280px] flex-shrink-0 flex flex-col h-full"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderRight: "1px solid var(--gray-brd-prim)" }}
        >
          <div
            className="sticky top-0 z-10 flex justify-between items-center p-4 flex-shrink-0"
            style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
          >
            <button onClick={() => setSidebarOpen(false)} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                side_navigation
              </span>
            </button>
            <button onClick={resetFilters} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                refresh
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-6 space-y-8">
              <div>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter custom text for font preview..."
                  className="w-full min-h-[72px] p-3 rounded-md resize-none text-font-name focus:outline-none focus:ring-2 dropdown-select"
                  rows={3}
                />
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Text presets</h3>
                <div className="flex flex-wrap gap-2">
                  {textPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedPreset(preset)
                        // Set appropriate text size for preset
                        if (preset === "Paragraph") {
                          setTextSize([20])
                        } else {
                          setTextSize([72])
                        }
                        // For "Names" preset, clear customText so each font shows its individual name
                        if (preset === "Names") {
                          setCustomText("")
                        } else {
                          setCustomText(getPresetContent(preset, fonts[0].name))
                        }
                      }}
                      className={`btn-sm ${selectedPreset === preset ? "active" : ""}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="segmented-control">
                  {(["Text", "Display", "Weirdo"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        // Clean filters before switching collection
                        cleanFiltersForCollection(mode)
                        setDisplayMode(mode)
                        // Scroll to top of the list when switching modes
                        setTimeout(() => {
                          const mainElement = document.querySelector('main')
                          if (mainElement) {
                            mainElement.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }, 100)
                      }}
                      className={`segmented-control-button ${displayMode === mode ? "active" : ""}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Font categories</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`btn-sm ${selectedCategories.includes(category) ? "active" : ""}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Appearance</h3>
                <div className="flex flex-wrap gap-2">
                  {getAvailableStyleTags().length > 0 ? getAvailableStyleTags().map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`btn-sm ${selectedStyles.includes(style) ? "active" : ""}`}
                    >
                      {style}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                      No style tags available
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Language support</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionLanguages().length > 0 ? getCollectionLanguages().map((language) => (
                    <button
                      key={language}
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language],
                        )
                      }
                      className={`btn-sm ${selectedLanguages.includes(language) ? "active" : ""}`}
                    >
                      {language}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>No languages available in {displayMode} collection</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Text size</h3>
                  <Slider
                    value={textSize}
                    onValueChange={setTextSize}
                    max={200}
                    min={50}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {textSize[0]}px
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Line height</h3>
                  <Slider
                    value={lineHeight}
                    onValueChange={setLineHeight}
                    max={200}
                    min={80}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {lineHeight[0]}%
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sidebar-title">Style</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weights.map((weight) => (
                    <button
                      key={weight}
                      onClick={() => toggleWeight(weight)}
                      className={`btn-sm ${selectedWeights.includes(weight) ? "active" : ""}`}
                    >
                      {weight}
                    </button>
                  ))}
                  <button onClick={() => setIsItalic(!isItalic)} className={`btn-sm ${isItalic ? "active" : ""}`}>
                    Italic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header
          className="sticky top-0 z-10 px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-[32px] h-[32px] flex items-center justify-center">
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} className="icon-btn">
                    <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                      side_navigation
                    </span>
                  </button>
                )}
              </div>
              <h1 className="text-font-name font-black font-sans cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'}>typedump</h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex flex-row gap-2">
                <button className="menu-tab active">Library</button>
                <button className="menu-tab">About</button>
              </nav>
              <a 
                href="mailto:make@logictomagic.com"
                className="icon-btn"
                title="Send feedback"
              >
                <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                  flag_2
                </span>
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16">
          <div
            className="sticky top-0 z-10 px-6 py-3 flex justify-between items-center"
            style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
          >
            <span className="text-sidebar-title">{getFilteredFonts().length} font families</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort("Date")}
                className={`btn-sm ${sortBy === "Date" ? "active" : ""}`}
              >
                {sortBy === "Date" && sortDirection === "desc" ? "New" : 
                 sortBy === "Date" && sortDirection === "asc" ? "Old" : "New"}
              </button>
              <button
                onClick={() => handleSort("Alphabetical")}
                className={`btn-sm ${sortBy === "Alphabetical" ? "active" : ""}`}
              >
                {sortBy === "Alphabetical" && sortDirection === "asc" ? "A–Z" : 
                 sortBy === "Alphabetical" && sortDirection === "desc" ? "Z–A" : "A–Z"}
              </button>
            </div>
          </div>

          <div className="">
            {isLoadingFonts ? (
              <div className="p-6 text-center">
                <div style={{ color: "var(--gray-cont-tert)" }}>Loading fonts...</div>
              </div>
            ) : fonts.length === 0 ? (
              <div className="p-6 text-center">
                <div style={{ color: "var(--gray-cont-tert)" }}>
                  No fonts uploaded yet. 
                  <a href="/admin-simple" className="text-blue-500 hover:underline ml-1">
                    Upload your first font
                  </a>
                </div>
              </div>
            ) : (
              getFilteredFonts().map((font) => {
              const fontSelection = fontWeightSelections[font.id] || (() => {
                // Use structured style data for default selection
                if (font._availableStyles && font._availableStyles.length > 0) {
                  // Prefer Regular style first, then first non-italic, then first available
                  const regularStyle = font._availableStyles.find(style => 
                    style.styleName === 'Regular' || (style.weight === 400 && !style.isItalic)
                  )
                  const nonItalicStyle = font._availableStyles.find(style => !style.isItalic)
                  const defaultStyle = regularStyle || nonItalicStyle || font._availableStyles[0]
                  
                  return {
                    weight: defaultStyle.weight,
                    italic: defaultStyle.isItalic
                  }
                }
                // Fallback for compatibility
                return { weight: 400, italic: false }
              })()
              const effectiveStyle = getEffectiveStyle(font.id)
              return (
                <div
                  key={font.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--gray-brd-prim)" }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2 flex-row gap-2">
                          <div
                            className="flex items-center px-2 py-1.5 rounded-md"
                            style={{ border: "1px solid var(--gray-brd-prim)" }}
                          >
                            <h2 className="text-font-name">{font.name}</h2>
                          </div>
                          <div className="relative">
                            <select
                              value={`${fontSelection.weight}-${fontSelection.italic}`}
                              onChange={(e) => {
                                const [weight, italic] = e.target.value.split("-")
                                console.log(`Dropdown change for font ${font.id} (${font.name}): ${weight}-${italic}`);
                                updateFontSelection(font.id, Number.parseInt(weight), italic === "true")
                              }}
                              disabled={font._availableStyles && font._availableStyles.length <= 1}
                              className={`dropdown-select text-sidebar-title pr-8 appearance-none ${
                                font._availableStyles && font._availableStyles.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {font._availableStyles?.map((style, index) => (
                                <option key={`${style.weight}-${style.isItalic}-${index}`} value={`${style.weight}-${style.isItalic}`}>
                                  {style.styleName}
                                </option>
                              ))}
                            </select>
                            <span
                              className="material-symbols-outlined absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                              style={{ fontWeight: 300, fontSize: "20px", color: "var(--gray-cont-tert)" }}
                            >
                              expand_more
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-author">
                            {font.type}, {font.styles} style{font.styles > 1 ? "s" : ""}
                          </span>
                          <span className="text-author">by {font.author}</span>
                        </div>
                      </div>
                      {(() => {
                        // Check if any font in the family has a download link
                        const hasDownloadLink = font._familyFonts?.some(f => f.downloadLink) || font.url
                        const downloadLink = font._familyFonts?.find(f => f.downloadLink)?.downloadLink || font.url
                        
                        if (hasDownloadLink) {
                          return (
                            <button
                              className="download-btn"
                              style={{
                                color: "#fcfcfc",
                                backgroundColor: "#0a0a0a",
                              }}
                              onClick={() => window.open(downloadLink, '_blank')}
                            >
                              Download
                            </button>
                          )
                        }
                        return null // Hide button if no download link
                      })()}
                    </div>
                    <div
                      contentEditable
                      suppressContentEditableWarning={true}
                      onInput={(e) => {
                        const element = e.currentTarget
                        const newText = element.textContent || ""
                        handlePreviewEdit(element, newText)
                      }}
                      onClick={(e) => {
                        // Only toggle card expansion if user is not selecting text for editing
                        const selection = window.getSelection()
                        if (!selection || selection.isCollapsed) {
                          e.preventDefault()
                          toggleCardExpansion(font.id)
                        }
                      }}
                      onFocus={(e) => {
                        // Prevent card expansion when focusing for text editing
                        e.stopPropagation()
                      }}
                      ref={(el) => setEditingElementRef(el)}
                      className="leading-relaxed whitespace-pre-line break-words overflow-visible cursor-text focus:outline-none"
                      style={{
                        fontSize: `${textSize[0]}px`,
                        lineHeight: `${lineHeight[0]}%`,
                        fontFamily: font.fontFamily,
                        fontWeight: effectiveStyle.weight,
                        fontStyle: effectiveStyle.italic ? "italic" : "normal",
                        color: "var(--gray-cont-prim)",
                        fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures || {}),
                        fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes || {}),
                      }}
                    >
                      {getPreviewContent(font.name)}
                    </div>

                    {expandedCards.has(font.id) && (
                      <div className="mt-6 space-y-4 pt-4" style={{ borderTop: "1px solid var(--gray-brd-prim)" }}>
                        {/* Style Alternates */}
                        {getStyleAlternates(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              Stylistic Alternates
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getStyleAlternates(font.id).map((feature) => (
                                <button
                                  key={feature}
                                  onClick={() => toggleOTFeature(font.id, feature)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature] ? "active" : ""}`}
                                >
                                  {feature}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other OpenType Features */}
                        {getOtherOTFeatures(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              OpenType Features
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getOtherOTFeatures(font.id).map((feature) => (
                                <button
                                  key={feature}
                                  onClick={() => toggleOTFeature(font.id, feature)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature] ? "active" : ""}`}
                                >
                                  {feature}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Variable Font Axes */}
                        {getVariableAxes(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              Variable Axes
                            </div>
                            <div className="flex flex-col md:flex-row md:gap-4 gap-3 max-w-[280px]">
                              {getVariableAxes(font.id).map((axis) => (
                                <div key={axis.tag} className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sidebar-title flex-shrink-0">{axis.name}</span>
                                    <Slider
                                      value={[fontVariableAxes[font.id]?.[axis.tag] || axis.default]}
                                      onValueChange={(value) => updateVariableAxis(font.id, axis.tag, value[0])}
                                      min={axis.min}
                                      max={axis.max}
                                      step={axis.tag === "wght" ? 1 : 0.1}
                                      className="flex-1"
                                    />
                                    <span
                                      className="text-sidebar-title flex-shrink-0"
                                      style={{ color: "var(--gray-cont-tert)" }}
                                    >
                                      {fontVariableAxes[font.id]?.[axis.tag] || axis.default}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
            )}
          </div>
        </main>

      </div>
      
      {/* Sticky footer at bottom of viewport */}
      <footer 
        className="fixed bottom-0 left-0 right-0 flex items-center justify-center px-6 py-4 z-10"
        style={{ 
          backgroundColor: "var(--gray-surface-prim)", 
          borderTop: "1px solid var(--gray-brd-prim)" 
        }}
      >
        <div className="flex justify-center items-center gap-8">
          <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
            © Baseline, 2025
          </span>
          <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
            Made by <a href="https://magicxlogic.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Magic x Logic</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
