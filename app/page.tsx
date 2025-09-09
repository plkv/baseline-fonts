"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
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
      return 'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'
    case "Basic":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"
    case "Paragraph":
      const paragraphs = [
        "Balenciaga, Our Legacy, and Acne Studios continue to redefine avant-garde style, pushing silhouettes beyond conventional logic. Designers like Demna and Jonny Johansson layer irony with tailoring, mixing XXL coats, micro-bags, raw denim, and surreal proportions. Runway shows in Paris, Milan, and New York thrive on spectacle: flashing lights, fragmented beats, and cryptic slogans. What once felt absurd now becomes street uniform, merging couture with hoodie culture. Numbers matter too: limited drops of 500 units, resale prices soaring +300%, collectors chasing hype like traders. Fashion turns volatility into its core language.",
        "The global market trades on symbols: AAPL at $212.45, ETH climbing +5.6%, EUR/USD swinging. Every decimal moves billions. Exchanges speak a secret dialect of IPO, ETF, CAGR, ROI. Investors chase 12% annual yield, hedge funds leverage ×10, while regulators warn of bubbles. Platforms like Robinhood and Revolut blur banking and gaming, reducing risk to a tap, turning volatility into entertainment. Graphs spike red → green → red, headlines shout \"RECORD CLOSE!\" and algorithms decide faster than humans blink. Finance becomes performance, a theater of numbers where % defines power more than words.",
        "Every startup dreams of unicorn status: $1B valuation, growth curve slashing up at 45°. Founders pitch \"AI-powered SaaS\" or \"climate-tech with blockchain backbone,\" their decks filled with KPIs, TAM, CAC vs LTV. Venture capitalists reply with buzz: pre-seed, Series A, ARR, burn rate. Acceleration feels like survival; one quarter without +20% and the board panics. Yet behind the charts are restless teams in coworking hubs, 3 a.m. Slack pings, endless beta launches. Success is both hype and math, a fragile balance between story and spreadsheet, where a single slide decides millions wired.",
        "Barcelona glows with contradictions: Gaudí's Sagrada Família still climbing skyward since 1882, while Torre Glòries mirrors LED grids in real time. Eixample blocks form geometric order, yet life spills chaotic with scooters, cava bottles, and late-night vermut. Remote workers fill cafés, toggling between Figma boards and Zoom calls, chasing deadlines across GMT+1. The port counts containers and cruise ships, the beach counts sunsets and tourists. Art, sport, fintech, and fashion overlap in one Mediterranean arena. Every corner feels alive with accents, from Passeig de Gràcia boutiques to hidden tapas bars in El Raval."
      ]
      return paragraphs[Math.floor(Math.random() * paragraphs.length)]
    case "Brands":
      const brandSets = [
        "Maison Margiela • Off-White • Y/Project • Rimowa • A-Cold-Wall* • Figma • Balenciaga • OpenAI • Byredo",
        "Figma • Arc'teryx • Rimowa • Aimé Leon Dore • Balenciaga • Klarna • Off-White • SpaceX • Notion",
        "OpenAI • Arc'teryx • Maison Margiela • A-Cold-Wall* • Y/Project • Klarna • Byredo • Balenciaga • SpaceX",
        "Byredo • Maison Margiela • Notion • Figma • Off-White • Rimowa • OpenAI • Balenciaga • Arc'teryx"
      ]
      return brandSets[Math.floor(Math.random() * brandSets.length)]
    default:
      return fontName
  }
}

export default function FontLibrary() {
  const pathname = usePathname()
  // UI State - initialize based on window size to prevent flash
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768
  })
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const selectRefs = useRef<Record<number, HTMLSelectElement | null>>({})
  
  // Font Data State  
  const [fonts, setFonts] = useState<FontData[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(true)
  const [customText, setCustomText] = useState("")
  const [textCursorPosition, setTextCursorPosition] = useState(0)
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
  
  // Get a random font-family from current fonts by collection
  const getRandomFontFromCollection = (collection: "Text" | "Display" | "Weirdo") => {
    const candidates = fonts.filter(f => f.collection === collection)
    if (candidates.length === 0) return "Inter Variable, system-ui, sans-serif"
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    return pick?.fontFamily || "Inter Variable, system-ui, sans-serif"
  }
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
        console.log('🔍 First font sample:', data.fonts?.[0])
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
          console.log(`🔍 First processed font sample:`, {
            name: catalogFonts[0]?.name,
            _familyFonts: catalogFonts[0]?._familyFonts?.length,
            variableAxes: catalogFonts[0]?.variableAxes,
            openTypeFeatures: catalogFonts[0]?.openTypeFeatures
          })
          
          // Load CSS for all fonts
          loadFontCSS(catalogFonts)
        }
      }
    } catch (error) {
      console.error('❌ Failed to load fonts:', error)
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

  // Handle resize events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-hide sidebar on mobile, auto-show on desktop
      if (mobile && sidebarOpen) {
        setSidebarOpen(false)
      } else if (!mobile && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [sidebarOpen])

  // Helper function to get stylistic alternates from font's OpenType features
  const getStyleAlternates = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font) return []
    
    // Get all OpenType features from multiple sources
    const allFeatures = new Map<string, string>()
    
    // Check main font OpenType features
    if (font.openTypeFeatures && Array.isArray(font.openTypeFeatures)) {
      font.openTypeFeatures.forEach((feature: string) => {
        processStyleFeature(feature, allFeatures)
      })
    }
    
    // Check family fonts if available
    if (font._familyFonts) {
      font._familyFonts.forEach(familyFont => {
        if (familyFont.openTypeFeatures && Array.isArray(familyFont.openTypeFeatures)) {
          familyFont.openTypeFeatures.forEach((feature: string) => {
            processStyleFeature(feature, allFeatures)
          })
        }
      })
    }
    
    return Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
  }
  
  // Helper function to process stylistic features
  const processStyleFeature = (feature: string, allFeatures: Map<string, string>) => {
    // Look for stylistic sets (ss01, ss02, etc.) and stylistic alternates
    if (feature.toLowerCase().includes('stylistic set') || 
        feature.toLowerCase().includes('stylistic alternates') ||
        /^ss\d+$/.test(feature.toLowerCase()) ||
        feature.match(/^ss\d+/i)) {
      // Convert readable names to OpenType tags while preserving descriptive names
      let tag = ''
      let title = feature
      
      if (feature.toLowerCase().includes('stylistic set 1')) tag = 'ss01'
      else if (feature.toLowerCase().includes('stylistic set 2')) tag = 'ss02'
      else if (feature.toLowerCase().includes('stylistic set 3')) tag = 'ss03'
      else if (feature.toLowerCase().includes('stylistic set 4')) tag = 'ss04'
      else if (feature.toLowerCase().includes('stylistic set 5')) tag = 'ss05'
      else if (feature.toLowerCase().includes('stylistic set 6')) tag = 'ss06'
      else if (feature.toLowerCase().includes('stylistic set 7')) tag = 'ss07'
      else if (feature.toLowerCase().includes('stylistic set 8')) tag = 'ss08'
      else if (feature.toLowerCase().includes('stylistic set 9')) tag = 'ss09'
      else if (feature.toLowerCase().includes('stylistic set 10')) tag = 'ss10'
      else if (feature.toLowerCase().includes('stylistic alternates')) tag = 'salt'
      else if (/^ss\d+$/i.test(feature)) tag = feature.toLowerCase()
      else if (feature.match(/^ss\d+/i)) {
        // Extract ss01, ss02 etc from start of feature name
        const match = feature.match(/^(ss\d+)/i)
        if (match) tag = match[1].toLowerCase()
      }
      
      if (tag) {
        allFeatures.set(tag, title)
      }
    }
  }

  // Helper function to get other OpenType features (non-stylistic)
  const getOtherOTFeatures = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    console.log(`🔧 getOtherOTFeatures for font ${fontId}:`, { font: font?.name, _familyFonts: font?._familyFonts?.length })
    if (!font?._familyFonts) return []
    
    // Mapping from readable feature names to OpenType tags with descriptive titles
    const featureMapping: Record<string, { tag: string; title: string }> = {
      'standard ligatures': { tag: 'liga', title: 'Standard Ligatures' },
      'discretionary ligatures': { tag: 'dlig', title: 'Discretionary Ligatures' },
      'contextual ligatures': { tag: 'clig', title: 'Contextual Ligatures' },
      'kerning': { tag: 'kern', title: 'Kerning' },
      'fractions': { tag: 'frac', title: 'Fractions' },
      'ordinals': { tag: 'ordn', title: 'Ordinals' },
      'superscript': { tag: 'sups', title: 'Superscript' },
      'subscript': { tag: 'subs', title: 'Subscript' },
      'small capitals': { tag: 'smcp', title: 'Small Capitals' },
      'all small caps': { tag: 'c2sc', title: 'All Small Caps' },
      'case-sensitive forms': { tag: 'case', title: 'Case-Sensitive Forms' },
      'slashed zero': { tag: 'zero', title: 'Slashed Zero' },
      'tabular nums': { tag: 'tnum', title: 'Tabular Numbers' },
      'proportional nums': { tag: 'pnum', title: 'Proportional Numbers' },
      'lining figures': { tag: 'lnum', title: 'Lining Figures' },
      'oldstyle figures': { tag: 'onum', title: 'Oldstyle Figures' }
    }
    
    const allFeatures = new Map<string, string>()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.openTypeFeatures) {
        familyFont.openTypeFeatures.forEach((feature: string) => {
          const lowerFeature = feature.toLowerCase()
          // Skip stylistic features (handled separately)
          if (!lowerFeature.includes('stylistic')) {
            const mapping = featureMapping[lowerFeature]
            if (mapping) {
              allFeatures.set(mapping.tag, mapping.title)
            }
          }
        })
      }
    })
    
    const result = Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
    console.log(`🔧 getOtherOTFeatures result for font ${fontId}:`, result)
    return result
  }

  const getVariableAxes = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    console.log(`🔧 getVariableAxes for font ${fontId}:`, { font: font?.name, _familyFonts: font?._familyFonts?.length })
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
    
    const result = Array.from(allAxes.values())
    console.log(`🔧 getVariableAxes result for font ${fontId}:`, result)
    return result
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
        const hasMatchingStyle = selectedStyles.some(style => {
          // Check styleTags if available
          if (font.styleTags && Array.isArray(font.styleTags)) {
            return font.styleTags.includes(style)
          }
          // Fallback: check against inferred tags
          if (style === 'Display' && font.collection === 'Display') return true
          if (style === 'Serif' && font.categories?.includes('Serif')) return true  
          if (style === 'Sans Serif' && font.categories?.includes('Sans')) return true
          if (style === 'Monospace' && font.categories?.includes('Mono')) return true
          if (style === 'Script' && font.categories?.includes('Script')) return true
          if (style === 'Decorative' && font.categories?.includes('Decorative')) return true
          return false
        })
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
    const actualTags = new Set<string>()
    const fontsInCollection = fonts.filter(font => (font.collection || 'Text') === displayMode)
    
    console.log(`\n=== STYLE TAGS DEBUG for ${displayMode} collection ===`)
    console.log(`Found ${fontsInCollection.length} fonts in ${displayMode} collection`)
    
    fontsInCollection.forEach((font, index) => {
      console.log(`Font ${index + 1}: "${font.name}"`)
      console.log(`  - styleTags field:`, font.styleTags)
      console.log(`  - type:`, font.type)
      
      // Only use ACTUAL styleTags from database
      if (font.styleTags && Array.isArray(font.styleTags) && font.styleTags.length > 0) {
        font.styleTags.forEach(tag => actualTags.add(tag))
      }
    })
    
    console.log(`All detected style tags:`, Array.from(actualTags))
    console.log(`=== END STYLE TAGS DEBUG ===\n`)
    
    // Return only actual tags from database, no fallbacks
    return Array.from(actualTags).sort()
  }

  // Get dynamic categories based on fonts actually present in current collection
  const getCollectionCategories = () => {
    const actualCategories = new Set<string>()
    const fontsInCollection = fonts.filter(font => (font.collection || 'Text') === displayMode)
    
    console.log(`\n=== CATEGORIES DEBUG for ${displayMode} collection ===`)
    console.log(`Found ${fontsInCollection.length} fonts in ${displayMode} collection`)
    
    fontsInCollection.forEach((font, index) => {
      console.log(`Font ${index + 1}: "${font.name}"`)
      console.log(`  - category field:`, font.category)
      console.log(`  - categories field:`, font.categories)
      console.log(`  - collection:`, font.collection)
      
      // Check both 'category' and 'categories' fields
      if (font.category) {
        if (Array.isArray(font.category)) {
          font.category.forEach(cat => actualCategories.add(cat))
        } else {
          actualCategories.add(font.category)
        }
      }
      
      if (font.categories && Array.isArray(font.categories)) {
        font.categories.forEach(cat => actualCategories.add(cat))
      }
    })
    
    console.log(`All detected categories:`, Array.from(actualCategories))
    console.log(`=== END CATEGORIES DEBUG ===\n`)
    
    // Return all found categories, sorted
    return Array.from(actualCategories).sort()
  }

  const getCollectionLanguages = () => {
    const actualLanguages = new Set<string>()
    const fontsInCollection = fonts.filter(font => (font.collection || 'Text') === displayMode)
    
    console.log(`\n=== LANGUAGES DEBUG for ${displayMode} collection ===`)
    console.log(`Found ${fontsInCollection.length} fonts in ${displayMode} collection`)
    
    fontsInCollection.forEach((font, index) => {
      console.log(`Font ${index + 1}: "${font.name}"`)
      console.log(`  - languages field:`, font.languages)
      
      // Only use ACTUAL languages from database
      if (font.languages && Array.isArray(font.languages) && font.languages.length > 0) {
        font.languages.forEach(language => actualLanguages.add(language))
      }
    })
    
    console.log(`All detected languages:`, Array.from(actualLanguages))
    console.log(`=== END LANGUAGES DEBUG ===\n`)
    
    // Return only actual languages from database, no fallbacks
    return Array.from(actualLanguages).sort()
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
        if (font.styleTags && Array.isArray(font.styleTags)) {
          font.styleTags.forEach(tag => newCollectionStyles.add(tag))
        }
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

  // Simplified missing symbols detection - focus on making unsupported chars slightly faded
  useEffect(() => {
    const highlightMissingSymbols = () => {
      // Find all font preview text display divs
      const previewDivs = document.querySelectorAll('div[style*="fontFamily"]:not([data-processed])')
      
      previewDivs.forEach((div) => {
        const element = div as HTMLElement
        const originalText = element.textContent || ''
        if (!originalText.trim()) return
        
        // Simple heuristic: characters outside basic Latin + common punctuation
        // are likely to need fallback fonts and should be highlighted
        let highlightedHTML = originalText
        
        // Look for non-Latin characters that might use fallback fonts
        const nonLatinChars = originalText.match(/[^\x00-\x7F\u00A0-\u00FF]/g) || []
        const uniqueNonLatinChars = [...new Set(nonLatinChars)]
        
        if (uniqueNonLatinChars.length > 0) {
          for (const char of uniqueNonLatinChars) {
            const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(escapedChar, 'g')
            // Wrap in span with fallback styling (slightly faded but still visible)
            highlightedHTML = highlightedHTML.replace(
              regex,
              `<span class="fallback-char">${char}</span>`
            )
          }
          
          // Only update if we have changes and element is not being edited
          if (highlightedHTML !== originalText && !element.matches(':focus-within')) {
            element.innerHTML = highlightedHTML
          }
        }
        
        // Mark as processed
        element.dataset.processed = 'true'
      })
    }
    
    // Run highlighting with a short delay to allow DOM updates
    const timer = setTimeout(highlightMissingSymbols, 100)
    return () => clearTimeout(timer)
  }, [fonts, customText, selectedPreset, textSize])

  // Placeholder function - now handled by useEffect
  const highlightMissingCharacters = (text: string, fontId: number) => {
    return text
  }

  // Controlled text input handler - no more cursor jumping
  const handleTextChange = (newText: string, newCursorPosition?: number) => {
    setCustomText(newText)
    if (newCursorPosition !== undefined) {
      setTextCursorPosition(newCursorPosition)
    }
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
    
    // Sync weight axis changes with dropdown selection
    if (axis === "wght") {
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: {
          ...(prev[fontId] || { weight: 400, italic: false }),
          weight: Math.round(value), // Round to nearest integer for weight
        },
      }))
    }
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
            opacity: 0.6 !important;
            filter: contrast(0.7) !important;
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
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 z-20" onClick={() => setSidebarOpen(false)} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
      )}
      {sidebarOpen && (
        <aside
          className={`w-[280px] flex-shrink-0 flex flex-col h-full ${isMobile ? 'fixed inset-y-0 left-0 z-30 shadow-lg' : ''}`}
          style={{ 
            backgroundColor: "var(--gray-surface-prim)", 
            borderRight: "1px solid var(--gray-brd-prim)",
            ...(isMobile ? { width: 'min(90vw, 100%)' } : {})
          }}
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
                      <span
                        className="segmented-control-ag"
                        style={{
                          textAlign: "center",
                          fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                          fontFamily: getRandomFontFromCollection(mode),
                          fontSize: "24px",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "24px",
                        }}
                      >
                        Ag
                      </span>
                      <span>{mode}</span>
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
                    min={12}
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
                    max={160}
                    min={90}
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
          className="sticky top-0 z-10 p-4 flex-shrink-0"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <div className="w-[32px] h-[32px] flex items-center justify-center">
                  <button onClick={() => setSidebarOpen(true)} className="icon-btn">
                    <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                      side_navigation
                    </span>
                  </button>
                </div>
              )}
              <h1 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                  fontFamily: "Inter Variable",
                  fontSize: "22px",
                  fontStyle: "normal",
                  fontWeight: 900,
                  lineHeight: "100%",
                  textTransform: "lowercase",
                  color: "var(--gray-cont-prim)"
                }}
                onClick={() => window.location.href = '/'}
              >
                typedump<sup style={{ fontWeight: 400, fontSize: "12px" }}> β</sup>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex flex-row gap-2">
                <a href="/" className={`menu-tab ${pathname === "/" ? "active" : ""}`}>Library</a>
                <a href="/about" className={`menu-tab ${pathname === "/about" ? "active" : ""}`}>About</a>
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
            className="sticky top-0 z-10 px-4 py-3 flex justify-between items-center"
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

          <div className="min-h-[100vh]">
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
                          <div
                            className="dropdown-wrap"
                            data-disabled={font._availableStyles && font._availableStyles.length <= 1 ? "true" : undefined}
                            onClick={() => {
                              const isDisabled = !!(font._availableStyles && font._availableStyles.length <= 1)
                              if (isDisabled) return
                              const el = selectRefs.current[font.id]
                              if (!el) return
                              try {
                                // Prefer native picker when available
                                // @ts-ignore
                                if (typeof el.showPicker === 'function') {
                                  // @ts-ignore
                                  el.showPicker()
                                  return
                                }
                              } catch {}
                              el.focus()
                              // Trigger click in a tick to avoid interfering with native behavior
                              setTimeout(() => el.click(), 0)
                            }}
                          >
                            <select
                              ref={(el) => { selectRefs.current[font.id] = el }}
                              value={`${fontSelection.weight}-${fontSelection.italic}`}
                              onChange={(e) => {
                                const [weight, italic] = e.target.value.split("-")
                                console.log(`Dropdown change for font ${font.id} (${font.name}): ${weight}-${italic}`);
                                updateFontSelection(font.id, Number.parseInt(weight), italic === "true")
                              }}
                              disabled={font._availableStyles && font._availableStyles.length <= 1}
                              className={`dropdown-select text-sidebar-title appearance-none ${
                                font._availableStyles && font._availableStyles.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {font._availableStyles?.map((style, index) => (
                                <option key={`${style.weight}-${style.isItalic}-${index}`} value={`${style.weight}-${style.isItalic}`}>
                                  {style.styleName}
                                </option>
                              ))}
                            </select>
                            {!(font._availableStyles && font._availableStyles.length <= 1) && (
                              <span className="material-symbols-outlined dropdown-icon" style={{ fontWeight: 300, fontSize: "20px" }}>expand_more</span>
                            )}
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
                        // Check if any font in the family has a download link set in admin (not the blob URL)
                        const adminDownloadLink = font._familyFonts?.find(f => f.downloadLink && f.downloadLink.trim() !== '')?.downloadLink
                        const hasAdminDownloadLink = Boolean(adminDownloadLink)
                        
                        if (hasAdminDownloadLink) {
                          return (
                            <button
                              className="download-btn"
                              style={{
                                color: "#fcfcfc",
                                backgroundColor: "#0a0a0a",
                              }}
                              onClick={() => window.open(adminDownloadLink, '_blank')}
                            >
                              Download
                            </button>
                          )
                        }
                        return null // Hide button if no admin download link is set
                      })()}
                    </div>
                    <div 
                      className="relative cursor-text"
                      onClick={() => toggleCardExpansion(font.id)}
                    >
                      {/* Semi-transparent textarea for text input - shows cursor but styled text shows through */}
                      <textarea
                        value={customText || getPreviewContent(font.name)}
                        onChange={(e) => {
                          const newValue = e.target.value
                          const newCursor = e.target.selectionStart || 0
                          handleTextChange(newValue, newCursor)
                        }}
                        onSelect={(e) => {
                          const newCursor = e.currentTarget.selectionStart || 0
                          setTextCursorPosition(newCursor)
                        }}
                        className="absolute inset-0 w-full h-full resize-none border-none outline-none bg-transparent resize-none"
                        style={{
                          fontSize: `${textSize[0]}px`,
                          lineHeight: `${lineHeight[0]}%`,
                          fontFamily: font.fontFamily,
                          color: 'rgba(0,0,0,0.01)', // Almost transparent text but cursor still visible
                          caretColor: 'var(--gray-cont-prim)', // Visible cursor
                          zIndex: 10,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Visible text display */}
                      <div
                        className="leading-relaxed whitespace-pre-line break-words overflow-visible pointer-events-none"
                        style={{
                          fontSize: `${textSize[0]}px`,
                          lineHeight: `${lineHeight[0]}%`,
                          fontFamily: font.fontFamily,
                          fontWeight: effectiveStyle.weight,
                          fontStyle: effectiveStyle.italic ? "italic" : "normal",
                          color: "var(--gray-cont-prim)",
                          fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures || {}),
                          fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes || {}),
                          minHeight: `${textSize[0] * 1.2}px`, // Ensure minimum height
                        }}
                      >
                        {customText || getPreviewContent(font.name)}
                      </div>
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
                                  key={feature.tag}
                                  onClick={() => toggleOTFeature(font.id, feature.tag)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature.tag] ? "active" : ""}`}
                                  title={feature.title}
                                >
                                  {feature.title}
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
                                  key={feature.tag}
                                  onClick={() => toggleOTFeature(font.id, feature.tag)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature.tag] ? "active" : ""}`}
                                  title={feature.title}
                                >
                                  {feature.title}
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
                            <div className="w-full max-w-[280px]">
                              {getVariableAxes(font.id).map((axis) => {
                                // Get initial value from current font characteristics
                                const getInitialValue = () => {
                                  if (axis.tag === "wght" && effectiveStyle.weight) {
                                    // Clamp weight to axis bounds
                                    return Math.max(axis.min, Math.min(axis.max, effectiveStyle.weight))
                                  }
                                  return fontVariableAxes[font.id]?.[axis.tag] || axis.default
                                }
                                
                                return (
                                  <div key={axis.tag} className="mb-3 last:mb-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sidebar-title flex-shrink-0 w-16">{axis.name}</span>
                                      <Slider
                                        value={[getInitialValue()]}
                                        onValueChange={(value) => updateVariableAxis(font.id, axis.tag, value[0])}
                                        min={axis.min}
                                        max={axis.max}
                                        step={axis.tag === "wght" ? 1 : 0.1}
                                        className="flex-1"
                                      />
                                      <span
                                        className="text-sidebar-title flex-shrink-0 w-12 text-right"
                                        style={{ color: "var(--gray-cont-tert)" }}
                                      >
                                        {Math.round((fontVariableAxes[font.id]?.[axis.tag] || getInitialValue()) * 10) / 10}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
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
            
            {/* Footer at end of catalog (styled like About) */}
            <footer 
              style={{ 
                display: "flex",
                padding: "24px",
                flexDirection: "column",
                alignItems: "flex-start",
                alignSelf: "stretch",
                borderTop: "1px solid var(--gray-brd-prim)" 
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                  © Baseline, 2025
                </span>
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)", textAlign: "right" }}>
                  Made by <a href="https://magicxlogic.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Magic x Logic</a>
                </span>
              </div>
            </footer>
          </div>
        </main>

      </div>
    </div>
  )
}
