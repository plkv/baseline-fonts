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
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
}

const textPresets = ["Names", "Key Glyphs", "Basic", "Paragraph", "Brands"]
const languages = ["Latin", "Cyrillic", "Georgian"]
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
  const [sortBy, setSortBy] = useState("New")
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
            
            // Calculate available weights differently for variable vs static fonts
            let availableWeights
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
            } else {
              // For static fonts, use actual weights
              const regularWeights = regularFonts.map(f => f.weight || 400)
              const italicWeights = italicFonts.map(f => f.weight || 400)
              const allWeights = [...new Set([...regularWeights, ...italicWeights])].sort((a, b) => a - b)
              availableWeights = regularWeights.length > 0 ? [...new Set(regularWeights)].sort((a, b) => a - b) : allWeights
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

  const styleAlternates = ["ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08"]
  const otherOTFeatures = ["liga", "kern", "frac", "ordn", "sups", "subs", "smcp", "c2sc", "case", "zero"]

  const getVariableAxes = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (font?.type !== "Variable") return []

    // Mock variable axes data - in real app this would come from font metadata
    const axes = []
    if (font.name === "Inter Variable") {
      axes.push({ tag: "wght", name: "Weight", min: 100, max: 900, default: 400 })
      axes.push({ tag: "slnt", name: "Slant", min: -10, max: 0, default: 0 })
    }
    if (font.name === "Space Grotesk") {
      axes.push({ tag: "wght", name: "Weight", min: 300, max: 700, default: 400 })
    }
    return axes
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
    setFontWeightSelections((prev) => ({
      ...prev,
      [fontId]: { weight, italic },
    }))
  }

  const getFilteredFonts = () => {
    const filtered = fonts.filter((font) => {
      // Filter by collection (displayMode)
      if (displayMode !== "Text" && font.collection !== displayMode) {
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

    // Apply sorting based on sortBy state
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "A–Z":
          return a.name.localeCompare(b.name)
        case "# Styles":
          return b.styles - a.styles // Descending order (most styles first)
        case "New":
        default:
          // Sort by upload date (newest first) - use family representative font's upload date
          const aDate = a._familyFonts?.[0]?.uploadedAt ? new Date(a._familyFonts[0].uploadedAt).getTime() : 0
          const bDate = b._familyFonts?.[0]?.uploadedAt ? new Date(b._familyFonts[0].uploadedAt).getTime() : 0
          return bDate - aDate
      }
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

  // Get all available style tags from loaded fonts
  const getAvailableStyleTags = () => {
    const allTags = new Set<string>()
    fonts.forEach(font => {
      font.styleTags.forEach(tag => allTags.add(tag))
    })
    return Array.from(allTags).sort()
  }

  // Get dynamic categories based on selected collection
  const getCollectionCategories = () => {
    const categoryOptions = {
      Text: ['Sans', 'Serif', 'Slab', 'Mono'],
      Display: ['Sans-based', 'Serif-based', 'Fatface', 'Script', 'Handwritten', 'Pixel', 'Vintage', 'Stencil'],
      Weirdo: ['Experimental', 'Symbol', 'Bitmap', 'Decorative', 'Artistic', 'Conceptual']
    }
    return categoryOptions[displayMode] || categoryOptions.Text
  }

  // Simple approach: Just detect fallback characters and color them grey
  // This relies on the browser's natural fallback behavior when fonts don't support characters

  // Highlight missing characters by wrapping them in spans that will use fallback fonts
  const highlightMissingCharacters = (text: string, fontId: number) => {
    // For now, use a simple approach: wrap common non-Latin characters 
    // The browser will use fallback fonts for unsupported characters, so we detect those
    
    let highlightedText = text
    
    // Characters that commonly need fallback fonts
    const potentialFallbackChars = [
      // Currency symbols
      '€', '£', '¥', '₽', '₹', '¢', '₩', '₪', '₨', '₵',
      // Extended Latin and diacritics  
      'ñ', 'ü', 'ß', 'æ', 'ø', 'þ', 'ð', 'ŋ', 'ə', 'ɨ', 'ɯ',
      'ç', 'é', 'è', 'ê', 'ë', 'à', 'á', 'â', 'ä', 'å', 'ã', 'ā',
      'í', 'ì', 'î', 'ï', 'ī', 'ò', 'ó', 'ô', 'ö', 'õ', 'ō', 'ø',
      'ú', 'ù', 'û', 'ü', 'ū', 'ý', 'ÿ',
      // Symbols and punctuation
      '©', '®', '™', '…', '–', '—', '\u2018', '\u2019', '\u201C', '\u201D',
      '°', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', '∑',
      '♠', '♣', '♥', '♦', '★', '☆', '✓', '✗', '•', '‣',
      // Greek letters
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
      'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
      'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ',
      'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω',
      // Cyrillic letters (common ones)
      'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М',
      'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я',
      'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м',
      'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я',
      // CJK samples
      '中', '文', '한', '글', '日', '本', '語', '漢', '字',
      // Arabic samples
      'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
    ]
    
    // Wrap these characters with a special class for potential fallback styling
    potentialFallbackChars.forEach(char => {
      if (text.includes(char)) {
        const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        highlightedText = highlightedText.replace(
          regex,
          `<span class="fallback-char" style="color: var(--gray-text-tert); opacity: 0.7;" title="May use fallback font">${char}</span>`
        )
      }
    })
    
    return highlightedText
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
      return {
        weight: selectedWeights.length > 0 ? selectedWeights[0] : variableAxes.wght || fontSelection.weight,
        italic: isItalic || fontSelection.italic,
        variableAxes,
        otFeatures,
      }
    }

    // Otherwise use individual font selection
    return {
      weight: variableAxes.wght || fontSelection.weight,
      italic: fontSelection.italic,
      variableAxes,
      otFeatures,
    }
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
                      onClick={() => setDisplayMode(mode)}
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
                  {languages.map((language) => (
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
                  ))}
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

        <main className="flex-1 overflow-y-auto">
          {/* Footer moved above content with 50vh height and bottom align */}
          <div 
            className="flex items-end justify-center px-6"
            style={{ height: "50vh" }}
          >
            <div className="text-center py-8">
              <div className="flex justify-center items-center gap-8">
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                  © Baseline, 2025
                </span>
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                  Made by <a href="https://magicxlogic.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Magic x Logic</a>
                </span>
              </div>
            </div>
          </div>

          <div
            className="sticky top-0 z-10 px-6 py-3 flex justify-between items-center"
            style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
          >
            <span className="text-sidebar-title">{getFilteredFonts().length} font families</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="dropdown-select">
              <option>New</option>
              <option># Styles</option>
              <option>A–Z</option>
            </select>
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
                // Get default selection based on the first available font in family
                if (font._familyFonts && font._familyFonts.length > 0) {
                  // Prefer Regular style first, then take first available
                  const regularFont = font._familyFonts.find(f => f.style === 'Regular' || !f.style?.toLowerCase().includes('italic'))
                  const defaultFont = regularFont || font._familyFonts[0]
                  return {
                    weight: defaultFont.weight || 400,
                    italic: defaultFont.style?.toLowerCase().includes('italic') || false
                  }
                }
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
                                updateFontSelection(font.id, Number.parseInt(weight), italic === "true")
                              }}
                              className="dropdown-select text-sidebar-title pr-8 appearance-none"
                            >
                              {(() => {
                                const options = []
                                
                                if (font.type === "Variable" && font._familyFonts) {
                                  // For variable fonts, combine all available styles from all fonts in the family
                                  const allAvailableStyles = new Set<string>()
                                  font._familyFonts.forEach((fontFile: any) => {
                                    const styles = fontFile?.availableStyles || []
                                    styles.forEach((style: string) => allAvailableStyles.add(style))
                                  })
                                  const availableStyles = Array.from(allAvailableStyles).sort()
                                  
                                  if (availableStyles.length > 0) {
                                    // Use the named instances from font metadata
                                    availableStyles.forEach((styleName, index) => {
                                      const isItalic = styleName.toLowerCase().includes('italic') || styleName.toLowerCase().includes('oblique')
                                      // Map style name to approximate weight for value (needed for font rendering)
                                      const weight = styleName.toLowerCase().includes('thin') ? 100
                                        : styleName.toLowerCase().includes('extralight') ? 200
                                        : styleName.toLowerCase().includes('light') ? 300
                                        : styleName.toLowerCase().includes('regular') ? 400
                                        : styleName.toLowerCase().includes('medium') ? 500
                                        : styleName.toLowerCase().includes('semibold') ? 600
                                        : styleName.toLowerCase().includes('bold') ? 700
                                        : styleName.toLowerCase().includes('extrabold') ? 800
                                        : styleName.toLowerCase().includes('black') ? 900
                                        : 400
                                      
                                      options.push(
                                        <option key={`${styleName}-${index}`} value={`${weight}-${isItalic}`}>
                                          {styleName}
                                        </option>
                                      )
                                    })
                                  } else {
                                    // Fallback if no availableStyles
                                    const regularFont = font._familyFonts.find(f => !f.style?.toLowerCase().includes('italic'))
                                    const italicFont = font._familyFonts.find(f => f.style?.toLowerCase().includes('italic'))
                                    
                                    if (regularFont) {
                                      options.push(
                                        <option key="regular" value={`${regularFont.weight || 400}-false`}>
                                          {regularFont.style || 'Regular'}
                                        </option>
                                      )
                                    }
                                    if (italicFont) {
                                      options.push(
                                        <option key="italic" value={`${italicFont.weight || 400}-true`}>
                                          {italicFont.style || 'Italic'}
                                        </option>
                                      )
                                    }
                                  }
                                } else if (font._familyFonts) {
                                  // For static fonts, show actual style names from metadata
                                  for (const familyFont of font._familyFonts) {
                                    const weight = familyFont.weight || 400
                                    const isItalic = familyFont.style?.toLowerCase().includes('italic')
                                    const styleName = familyFont.style || (isItalic ? 'Italic' : 'Regular')
                                    
                                    // Use the actual style name from the font metadata
                                    const displayName = styleName
                                    
                                    options.push(
                                      <option key={`${familyFont.id}`} value={`${weight}-${isItalic}`}>
                                        {displayName}
                                      </option>
                                    )
                                  }
                                } else {
                                  // Fallback to old logic for compatibility
                                  font.availableWeights.forEach(weight => {
                                    options.push(
                                      <option key={`${weight}-false`} value={`${weight}-false`}>
                                        {weight} Regular
                                      </option>
                                    )
                                    if (font.hasItalic) {
                                      options.push(
                                        <option key={`${weight}-true`} value={`${weight}-true`}>
                                          {weight} Italic
                                        </option>
                                      )
                                    }
                                  })
                                }
                                return options
                              })()}
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
                      onClick={() => toggleCardExpansion(font.id)}
                      ref={(el) => setEditingElementRef(el)}
                      className="leading-relaxed whitespace-pre-line break-words overflow-visible cursor-text focus:outline-none"
                      style={{
                        fontSize: `${selectedPreset === "Paragraph" ? 20 : textSize[0]}px`,
                        lineHeight: `${lineHeight[0]}%`,
                        fontFamily: font.fontFamily,
                        fontWeight: effectiveStyle.weight,
                        fontStyle: effectiveStyle.italic ? "italic" : "normal",
                        color: "var(--gray-cont-prim)",
                        fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures || {}),
                        fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes || {}),
                      }}
                      dangerouslySetInnerHTML={{
                        __html: highlightMissingCharacters(getPreviewContent(font.name), font.id)
                      }}
                    ></div>

                    {expandedCards.has(font.id) && (
                      <div className="mt-6 space-y-4 pt-4" style={{ borderTop: "1px solid var(--gray-brd-prim)" }}>
                        {/* Style Alternates */}
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {styleAlternates.map((feature) => (
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

                        {/* Other OpenType Features */}
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {otherOTFeatures.map((feature) => (
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

                        {/* Variable Font Axes */}
                        {font.type === "Variable" && getVariableAxes(font.id).length > 0 && (
                          <div>
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
    </div>
  )
}
