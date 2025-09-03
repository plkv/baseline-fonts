"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Moon, Sun, RotateCcw, Palette, Monitor, Menu } from "lucide-react"

// Fonts are now loaded dynamically from uploaded fonts
const hardcodedFonts = [
  {
    name: "Inter",
    styles: 18,
    features: ["liga", "kern", "tnum", "zero"],
    category: "Sans Serif",
    price: "Free",
    isVariable: true,
    availableStyles: ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"],
    availableWeights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variableAxes: [
      { name: "Weight", axis: "wght", min: 100, max: 900, default: 400 },
      { name: "Slant", axis: "slnt", min: -10, max: 0, default: 0 },
    ],
    openTypeFeatures: [
      "Standard Ligatures",
      "Contextual Alternates",
      "Tabular Numbers",
      "Slashed Zero",
      "Case Sensitive Forms",
      "Stylistic Set 01",
      "Stylistic Set 02",
    ],
    languages: ["Latin", "Cyrillic", "Greek", "Vietnamese", "Arabic", "Hebrew"],
  },
  {
    name: "Funnel Sans",
    styles: 8,
    features: ["liga", "kern", "tnum"],
    category: "Sans Serif",
    price: "Free",
    isVariable: false,
    availableStyles: ["Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold"],
    availableWeights: [300, 400, 500, 600, 700, 800],
    openTypeFeatures: ["Standard Ligatures", "Kerning", "Tabular Numbers", "Proportional Figures"],
    languages: ["Latin", "Cyrillic", "Greek", "Vietnamese"],
  },
  {
    name: "Spline Sans",
    styles: 14,
    features: ["liga", "kern", "frac", "case"],
    category: "Sans Serif",
    price: "Free",
    isVariable: true,
    availableStyles: ["Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold"],
    availableWeights: [300, 400, 500, 600, 700, 800],
    variableAxes: [{ name: "Weight", axis: "wght", min: 300, max: 800, default: 400 }],
    openTypeFeatures: ["Standard Ligatures", "Kerning", "Fractions", "Case Sensitive Forms", "Stylistic Alternates"],
    languages: ["Latin", "Cyrillic", "Greek", "Vietnamese", "Thai"],
  },
  {
    name: "Playfair Display",
    styles: 12,
    features: ["liga", "kern", "swsh"],
    category: "Serif",
    price: "Free",
    isVariable: true,
    availableStyles: ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"],
    availableWeights: [400, 500, 600, 700, 800, 900],
    variableAxes: [
      { name: "Weight", axis: "wght", min: 400, max: 900, default: 400 },
      { name: "Optical Size", axis: "opsz", min: 6, max: 120, default: 14 },
    ],
    openTypeFeatures: ["Standard Ligatures", "Stylistic Alternates", "Swashes", "Old Style Figures", "Small Caps"],
    languages: ["Latin", "Cyrillic", "Vietnamese"],
  },
  {
    name: "JetBrains Mono",
    styles: 16,
    features: ["liga", "kern", "zero"],
    category: "Monospace",
    price: "Free",
    isVariable: true,
    availableStyles: ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold"],
    availableWeights: [100, 200, 300, 400, 500, 600, 700, 800],
    variableAxes: [{ name: "Weight", axis: "wght", min: 100, max: 800, default: 400 }],
    openTypeFeatures: ["Contextual Ligatures", "Slashed Zero", "Stylistic Set 01", "Stylistic Set 02", "Kerning"],
    languages: ["Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Georgian", "Armenian"],
  },
  {
    name: "Crimson Text",
    styles: 6,
    features: ["liga", "kern", "onum"],
    category: "Serif",
    price: "Free",
    isVariable: false,
    availableStyles: ["Regular", "Italic", "SemiBold", "Bold"],
    availableWeights: [400, 600, 700],
    openTypeFeatures: ["Standard Ligatures", "Old Style Figures", "Small Caps", "Kerning", "Discretionary Ligatures"],
    languages: ["Latin", "Greek", "Vietnamese"],
  },
]

const presetTexts = {
  keysymbols: 'RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->',
  names: "", // Will be dynamically set based on current font
  paragraph:
    "The Amazon rainforest, often called the lungs of the Earth, spans over 5.5 million square kilometers across nine countries in South America. This vast ecosystem is home to an estimated 400 billion individual trees representing 16,000 species, making it the most biodiverse terrestrial ecosystem on our planet. Scientists believe that one in ten known species in the world lives in the Amazon rainforest, including over 2.5 million insect species, tens of thousands of plants, and some 2,000 birds and mammals. The forest plays a crucial role in regulating the global climate by absorbing large amounts of carbon dioxide and producing oxygen through photosynthesis.",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz",
  brands: "Nike Adidas Apple Google Microsoft Amazon Tesla SpaceX",
  symbols: "!@#$%^&*()_+-=[]{}|;':\",./<>?`~",
}

const textPresets = {
  "Key symbols": 'RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->',
  Names: "",
  Paragraph:
    'Breaking: Local bakery owner Sarah Quinn accidentally created the world\'s spiciest croissant yesterday. "I mixed up the sugar & ghost pepper containers," she laughed. The mistake happened around 3:46 AM during prep work. Customers who tried it described reactions from tears to uncontrollable hiccups. Fire department arrived when smoke detectors went off, but it was a false alarm. The fire department\'s phone rang constantly with food bloggers asking: "Can we try some?" @SpicyFoodie tweeted about it. Sarah plans adding "Devil\'s Croissant" to her menu -> unexpected success from kitchen chaos.',
  Brands: "McDonald's Nike Apple Google Microsoft Amazon Facebook Tesla Coca-Cola Samsung",
  Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz",
}

const presetSizes = [10, 12, 14, 16, 18, 24, 32, 48, 64, 72, 96, 120]

const colorPresets = [
  { name: "Default", value: "default", lightBg: "bg-stone-50", darkText: "text-stone-200" },
  { name: "Blue", value: "blue", lightBg: "bg-blue-50", darkText: "text-blue-200" },
  { name: "Green", value: "green", lightBg: "bg-green-50", darkText: "text-green-200" },
  { name: "Purple", value: "purple", lightBg: "bg-purple-50", darkText: "text-purple-200" },
  { name: "Pink", value: "pink", lightBg: "bg-pink-50", darkText: "text-pink-200" },
  { name: "Orange", value: "orange", lightBg: "bg-orange-50", darkText: "text-orange-200" },
]

export default function FontCatalog() {
  const [previewText, setPreviewText] = useState('RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->')
  const [searchQuery, setSearchQuery] = useState("")
  const [customText, setCustomText] = useState("RKFJIGCQ aueyrgsltf 012469 @&?;->")
  const [textPreset, setTextPreset] = useState("keysymbols")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [fontWeight, setFontWeight] = useState([400])
  const [fontSize, setFontSize] = useState([72])
  const [presetSize, setPresetSize] = useState("72")
  const [activeOpenTypeFeatures, setActiveOpenTypeFeatures] = useState<string[]>([])
  const [maxStyles, setMaxStyles] = useState([20])
  const [fontType, setFontType] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [sortBy, setSortBy] = useState("name")
  const [hoveredFont, setHoveredFont] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto")
  const [darkMode, setDarkMode] = useState(false)
  const [letterSpacing, setLetterSpacing] = useState([0])
  const [lineHeight, setLineHeight] = useState([1.2])
  const [presetLetterSpacing, setPresetLetterSpacing] = useState("0")
  const [presetLineHeight, setPresetLineHeight] = useState("1.2")
  const [globalSearch, setGlobalSearch] = useState("")
  const [colorTheme, setColorTheme] = useState("default") // Declare colorTheme state
  const [isLetterSpacingHovered, setIsLetterSpacingHovered] = useState(false)
  const [isLineHeightHovered, setIsLineHeightHovered] = useState(false)
  const [isFontSizeHovered, setIsFontSizeHovered] = useState(false)
  const [logoFont, setLogoFont] = useState("")
  const [uploadedFonts, setUploadedFonts] = useState<any[]>([])
  const [allFonts, setAllFonts] = useState<any[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(true)
  const [variableAxisValues, setVariableAxisValues] = useState<{ [fontName: string]: { [axis: string]: number } }>({})

  const letterSpacingPresets = [-0.05, -0.025, 0, 0.025, 0.05, 0.1, 0.15, 0.2]
  const lineHeightPresets = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0]

  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  const [isAnimating, setIsAnimating] = useState(false)
  const [expandedCards, setExpandedCards] = useState<string[]>([])
  const [selectedWeight, setSelectedWeight] = useState(400)
  const [textAlign, setTextAlign] = useState("left")
  const [selectedTextPreset, setSelectedTextPreset] = useState("Key symbols")

  const resetSettings = () => {
    setPreviewText('RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->')
    setCustomText('RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->')
    setTextPreset("keysymbols")
    setSelectedCategories([])
    setSelectedLanguages([])
    setFontWeight([400])
    setFontSize([72])
    setPresetSize("72")
    setActiveOpenTypeFeatures([])
    setMaxStyles([20])
    setFontType(false)
    setSortBy("name")
    setColorTheme("default")
    setLetterSpacing([0])
    setLineHeight([1.2])
    setPresetLetterSpacing("0")
    setPresetLineHeight("1.2")
    setVariableAxisValues({})
  }

  // Dynamically load font CSS for uploaded fonts
  const loadFontCSS = useCallback((fonts: any[]) => {
    // Remove existing uploaded font styles
    const existingStyles = document.querySelectorAll('style[data-uploaded-font]')
    existingStyles.forEach(style => style.remove())

    // Add CSS for each uploaded font
    fonts.forEach((font, index) => {
      if (font.url) {
        const style = document.createElement('style')
        style.setAttribute('data-uploaded-font', font.name)
        
        // Determine font format - TTF files should use 'truetype'
        let fontFormat = 'truetype'
        let srcFormat = `url("${font.url}") format("truetype")`
        
        if (font.format === 'otf') {
          fontFormat = 'opentype'
          srcFormat = `url("${font.url}") format("opentype")`
        }
        
        // Create normalized font family name
        const normalizedName = `uploaded-font-${index}-${font.name.replace(/[^a-zA-Z0-9]/g, '-')}`
        
        style.textContent = `
          @font-face {
            font-family: "${normalizedName}";
            src: url("${font.url}");
            font-weight: ${font.weight || 400};
            font-style: normal;
            font-display: swap;
          }
          
          /* Map original family name to normalized name */
          .uploaded-font[data-font-family="${font.family}"] {
            font-family: "${normalizedName}", "${font.family}", monospace, system-ui, sans-serif !important;
          }
          
          /* Additional fallback without data attribute */
          .font-${font.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()} {
            font-family: "${normalizedName}", "${font.family}", monospace, system-ui, sans-serif !important;
          }
        `
        document.head.appendChild(style)
        
        console.log(`✓ Loaded font: ${font.family} -> ${normalizedName} (${fontFormat})`)
        console.log(`  URL: ${font.url}`)
      }
    })
  }, [])

  // Load uploaded fonts from API
  const loadUploadedFonts = useCallback(async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts/list')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.fonts) {
          setUploadedFonts(data.fonts)
          // Filter only published fonts for public display
          const publishedFonts = data.fonts.filter((font: any) => font.published !== false)
          // Load CSS for published fonts
          loadFontCSS(publishedFonts)
          // Use only published fonts
          setAllFonts(publishedFonts)
        }
      }
    } catch (error) {
      console.error('Failed to load uploaded fonts:', error)
    } finally {
      setIsLoadingFonts(false)
    }
  }, [loadFontCSS])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = e.clientX
    if (newWidth >= 280 && newWidth <= 600) {
      setSidebarWidth(newWidth)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
  }, [])

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (themeMode === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      setDarkMode(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches)
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [themeMode])

  useEffect(() => {
    if (allFonts.length > 0) {
      const randomFont = allFonts[Math.floor(Math.random() * allFonts.length)]
      setLogoFont(randomFont.name)
    }
  }, [allFonts])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setWindowWidth(width)
      const mobile = width < 1100
      setIsMobile(mobile)

      // Hide sidebar by default on mobile
      if (mobile && sidebarVisible) {
        setSidebarVisible(false)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Load uploaded fonts on component mount
  useEffect(() => {
    loadUploadedFonts()
  }, [loadUploadedFonts])

  // Add polling to check for new fonts every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadUploadedFonts()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [loadUploadedFonts])

  const filteredFonts = allFonts.filter((font) => {
    const matchesSearch = font.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((cat) => font.category.toLowerCase() === cat.toLowerCase())
    const matchesStyles = font.styles <= maxStyles[0]
    const matchesType = !fontType || font.isVariable
    const matchesWeight = fontWeight[0] === 400 || font.availableWeights.includes(fontWeight[0])
    const matchesLanguage =
      selectedLanguages.length === 0 || selectedLanguages.some((lang) => font.languages.includes(lang))

    return matchesSearch && matchesCategory && matchesStyles && matchesType && matchesWeight && matchesLanguage
  })

  const handleTextPresetChange = (preset: string) => {
    setIsAnimating(true)
    setSelectedTextPreset(preset)
    setTextPreset(preset.toLowerCase().replace(" ", ""))

    if (preset === "Paragraph") {
      setFontSize([20])
      setPresetSize("20")
      setPreviewText(textPresets.Paragraph)
    } else if (preset === "Names") {
      // Reset to default size when switching from paragraph
      if (selectedTextPreset === "Paragraph") {
        setFontSize([72])
        setPresetSize("72")
      }
      setPreviewText("") // Will be handled by font name display
    } else if (preset === "Brands") {
      // Reset to default size when switching from paragraph
      if (selectedTextPreset === "Paragraph") {
        setFontSize([72])
        setPresetSize("72")
      }
      setPreviewText(textPresets.Brands)
    } else if (preset === "Alphabet") {
      // Reset to default size when switching from paragraph
      if (selectedTextPreset === "Paragraph") {
        setFontSize([72])
        setPresetSize("72")
      }
      setPreviewText(textPresets.Alphabet)
    } else {
      // Key symbols or other presets
      if (selectedTextPreset === "Paragraph") {
        setFontSize([72])
        setPresetSize("72")
      }
      setPreviewText(textPresets["Key symbols"])
    }
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleFontSizeChange = (value: number[]) => {
    setIsAnimating(true)
    setFontSize(value)
    setPresetSize(value[0].toString())
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePresetSizeChange = (value: string) => {
    setIsAnimating(true)
    setPresetSize(value)
    setFontSize([Number.parseInt(value)])
    setTimeout(() => setIsAnimating(false), 300)
  }

  const toggleCategory = (category: string) => {
    setIsAnimating(true)
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
    setTimeout(() => setIsAnimating(false), 300)
  }

  const toggleLanguage = (language: string) => {
    setIsAnimating(true)
    setSelectedLanguages((prev) =>
      prev.includes(language) ? prev.filter((lang) => lang !== language) : [...prev, language],
    )
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleWeightChange = (weight: number) => {
    setIsAnimating(true)
    setFontWeight([weight])
    setSelectedWeight(weight) // Apply weight to font previews
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleMaxStylesChange = (value: number[]) => {
    setIsAnimating(true)
    setMaxStyles(value)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleFontTypeChange = (checked: boolean) => {
    setIsAnimating(true)
    setFontType(checked)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const toggleOpenTypeFeature = (feature: string) => {
    setActiveOpenTypeFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature],
    )
  }

  const getFontFamily = (fontName: string) => {
    // For uploaded fonts, we'll handle font loading via CSS classes
    // This function is mainly used for logo fonts
    const uploadedFont = uploadedFonts.find(font => font.name === fontName || font.family === fontName)
    if (uploadedFont) {
      // Return the normalized font family name
      const fontIndex = uploadedFonts.findIndex(font => font.name === fontName || font.family === fontName)
      const normalizedName = `uploaded-font-${fontIndex}-${uploadedFont.name.replace(/[^a-zA-Z0-9]/g, '-')}`
      return `"${normalizedName}", "${uploadedFont.family}", monospace, system-ui, sans-serif`
    }
    
    // Fallback for any other fonts  
    return `"${fontName}", system-ui, sans-serif`
  }

  const getAvailableWeights = () => {
    if (selectedCategories.length === 0) {
      // Return common weights across all fonts
      return [100, 200, 300, 400, 500, 600, 700, 800, 900]
    }

    const relevantFonts = allFonts.filter((font) =>
      selectedCategories.some((cat) => font.category.toLowerCase().includes(cat.toLowerCase())),
    )

    if (relevantFonts.length === 0) return [400]

    // Get intersection of available weights
    return relevantFonts.reduce(
      (weights, font) => weights.filter((w) => font.availableWeights.includes(w)),
      relevantFonts[0].availableWeights,
    )
  }

  const getDisplayText = (fontName: string) => {
    if (selectedTextPreset === "Names") {
      return fontName
    }
    return previewText
  }

  const getColorThemeClasses = () => {
    const preset = colorPresets.find((p) => p.value === colorTheme)
    if (!preset) return { lightBg: "bg-stone-50", darkText: "text-stone-200" }
    return { lightBg: preset.lightBg, darkText: preset.darkText }
  }

  const getThemeBackground = () => {
    const { lightBg } = getColorThemeClasses()
    return darkMode ? "bg-stone-950" : colorTheme === "default" ? "bg-stone-50" : lightBg
  }

  const getThemeText = () => {
    const { darkText } = getColorThemeClasses()
    return darkMode ? (colorTheme === "default" ? "text-stone-200" : darkText) : "text-stone-900"
  }

  const getThemeAccent = () => {
    const { lightBg, darkText } = getColorThemeClasses()
    if (colorTheme === "default") {
      return darkMode ? "text-stone-400" : "text-stone-600"
    }
    return darkMode ? darkText : lightBg.replace("bg-", "text-").replace("-50", "-600")
  }

  const getThemeCardBg = () => {
    const { lightBg } = getColorThemeClasses()
    if (colorTheme === "default") {
      return darkMode ? "bg-stone-900" : "bg-white"
    }
    return darkMode ? "bg-stone-900" : lightBg.replace("-50", "-25")
  }

  const getThemeBorder = () => {
    const { lightBg } = getColorThemeClasses()
    if (colorTheme === "default") {
      return darkMode ? "border-stone-800" : "border-stone-200"
    }
    return darkMode ? "border-stone-800" : lightBg.replace("bg-", "border-").replace("-50", "-200")
  }

  const getTransparentBg = () => {
    return darkMode ? "bg-stone-950/80 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"
  }

  const handleThemeToggle = () => {
    if (themeMode === "auto") {
      setThemeMode("light")
      setDarkMode(false)
    } else if (themeMode === "light") {
      setThemeMode("dark")
      setDarkMode(true)
    } else {
      setThemeMode("auto")
      // In real app, would detect system preference
      setDarkMode(false)
    }
  }

  const handleLetterSpacingChange = (value: number[]) => {
    setIsAnimating(true)
    setLetterSpacing(value)
    setPresetLetterSpacing(value[0].toString())
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePresetLetterSpacingChange = (value: string) => {
    setIsAnimating(true)
    setPresetLetterSpacing(value)
    setLetterSpacing([Number.parseFloat(value) * 100])
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleLineHeightChange = (value: number[]) => {
    setIsAnimating(true)
    setLineHeight(value)
    setPresetLineHeight((value[0] * 100).toString())
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePresetLineHeightChange = (value: string) => {
    setIsAnimating(true)
    setPresetLineHeight(value)
    setLineHeight([Number.parseFloat(value) / 100])
    setTimeout(() => setIsAnimating(false), 300)
  }

  const getDropdownStyles = () => {
    const baseStyles = `${getTransparentBg()} ${getThemeBorder()} ${getThemeText()}`
    return baseStyles
  }

  const getDropdownItemStyles = () => {
    return `${getThemeText()} hover:${getThemeCardBg()} focus:${getThemeCardBg()}`
  }

  const handleSortChange = (sort: string) => {
    setIsAnimating(true)
    setSortBy(sort)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const availableLanguages = useMemo(() => {
    const languages = new Set<string>()
    allFonts.forEach((font) => {
      (font.languageSupport || font.languages)?.forEach((lang: string) => languages.add(lang))
    })
    return Array.from(languages).sort()
  }, [allFonts])

  const getControlStyles = () => ({
    base: "h-8 px-3 text-sm tracking-tighter transition-all duration-300",
    button: `${darkMode ? "text-stone-50 hover:bg-stone-800" : `${getThemeText()} hover:${getThemeCardBg()}`}`,
    badge: `cursor-pointer text-xs tracking-tighter rounded-full px-3 py-1 h-6 transition-all duration-300`,
    input: `w-full resize-none border-none outline-none bg-transparent ${getThemeText()} tracking-[0] p-0 overflow-hidden`,
    label: "text-sm font-medium tracking-tighter",
  })

  const getPreviewText = (fontName: string) => {
    switch (selectedTextPreset) {
      case "Key symbols":
        return 'RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->'
      case "Names":
        return fontName
      case "Paragraph":
        return 'Breaking: Local bakery owner Sarah Quinn accidentally created the world\'s spiciest croissant yesterday. "I mixed up the sugar & ghost pepper containers," she laughed. The mistake happened around 3:46 AM during prep work. Customers who tried it described reactions from tears to uncontrollable hiccups. Fire department arrived when smoke detectors went off, but it was a false alarm. The fire department\'s phone rang constantly with food bloggers asking: "Can we try some?" @SpicyFoodie tweeted about it. Sarah plans adding "Devil\'s Croissant" to her menu -> unexpected success from kitchen chaos.'
      case "Brands":
        return "Nike Adidas Apple Google Microsoft Amazon Facebook Tesla BMW Mercedes"
      case "Alphabet":
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"
      default:
        return customText || 'RKFJIGCQ aueyrgsltf 0123469 «"(@&?;->'
    }
  }

  const getVariableFontStyle = (font: any) => {
    if (!font.isVariable || !font.variableAxes) return {}

    const settings = font.variableAxes
      .map((axis) => `"${axis.axis}" ${variableAxisValues[font.name]?.[axis.axis] || axis.default}`)
      .join(", ")

    return { fontVariationSettings: settings }
  }

  const sortedFonts = useMemo(() => {
    const sorted = [...filteredFonts]
    switch (sortBy) {
      case "new":
        // Simulate new fonts by reversing order
        return sorted.reverse()
      case "styles":
        return sorted.sort((a, b) => b.styles - a.styles)
      case "a-z":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return sorted
    }
  }, [filteredFonts, sortBy])

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${getThemeBackground()} ${getThemeText()}`}
      style={{ fontFeatureSettings: "'ss01' on, 'ss03' on, 'cv06' on, 'cv11' on" }}
    >
      <div className="tracking-[0] text-sm min-h-screen">
        <header
          className={`transition-all duration-500 ${darkMode ? "bg-stone-950/90 backdrop-blur-sm border-stone-800" : `${getThemeCardBg()}/90 backdrop-blur-sm ${getThemeBorder()}`} border-b`}
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <nav className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm tracking-tighter h-8 px-3 transition-all duration-300 ${darkMode ? "text-stone-50 hover:bg-stone-800" : `${getThemeText()} hover:${getThemeCardBg()}`}`}
                >
                  Fonts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm tracking-tighter h-8 px-3 transition-all duration-300 ${darkMode ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800" : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"}`}
                >
                  About
                </Button>
                <span className={`text-xs px-2 tracking-tighter transition-all duration-300 ${darkMode ? "text-stone-500" : "text-stone-400"}`}>
                  v.0.014
                </span>
              </nav>

              <div className="flex-1 flex justify-center">
                <h1
                  className={`text-2xl font-bold tracking-tighter transition-colors duration-300 ${getThemeText()}`}
                  style={{ fontFamily: getFontFamily(logoFont) }}
                >
                  Baseline
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 px-2 transition-all duration-300 ${darkMode ? "text-stone-50 hover:bg-stone-800" : `${getThemeText()} hover:${getThemeCardBg()}`}`}
                    >
                      <Palette
                        className={`w-4 h-4 transition-colors duration-300 ${darkMode ? getColorThemeClasses().darkText : getThemeAccent()}`}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={`transition-all duration-300 ${getTransparentBg()} ${getThemeBorder()}`}
                  >
                    {colorPresets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.value}
                        onClick={() => setColorTheme(preset.value)}
                        className={`flex items-center gap-2 transition-all duration-300 ${darkMode ? "text-stone-50 hover:bg-stone-800/50" : `${getThemeText()} hover:bg-stone-100/50`}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                            colorTheme === preset.value
                              ? `border-2 ${darkMode ? "border-stone-100" : "border-stone-900"}`
                              : `border ${darkMode ? "border-stone-600" : "border-stone-300"}`
                          } ${
                            preset.value === "default"
                              ? darkMode
                                ? "bg-stone-700"
                                : "bg-stone-300"
                              : darkMode
                                ? preset.darkText.replace("text-", "bg-").replace("-200", "-800")
                                : preset.lightBg
                          }`}
                        />
                        {preset.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThemeToggle}
                  className={`h-8 px-2 transition-all duration-300 ${darkMode ? "text-stone-50 hover:bg-stone-800" : `${getThemeText()} hover:${getThemeCardBg()}`}`}
                >
                  {themeMode === "auto" ? (
                    <Monitor className="w-4 h-4" />
                  ) : themeMode === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {isMobile && sidebarVisible && (
            <div
              className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
              onClick={() => setSidebarVisible(false)}
            />
          )}

          <aside
            ref={sidebarRef}
            className={`${
              isMobile
                ? `fixed left-0 top-0 z-50 h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
                    sidebarVisible
                      ? "transform translate-x-0 opacity-100"
                      : "transform -translate-x-full opacity-0 pointer-events-none"
                  }`
                : `sticky top-0 h-screen overflow-y-auto transition-all duration-500 ease-in-out ${
                    sidebarVisible
                      ? "transform translate-x-0 opacity-100"
                      : "transform -translate-x-full opacity-0 pointer-events-none"
                  }`
            } ${darkMode ? "bg-stone-950/95 backdrop-blur-md border-stone-800" : `${getThemeCardBg()}/95 backdrop-blur-md ${getThemeBorder()}`} ${
              isMobile ? "border-r shadow-2xl" : "border-r"
            } p-6 pb-12 relative`}
            style={{
              width: sidebarVisible ? sidebarWidth : 0,
              ...(isMobile && { width: sidebarVisible ? 320 : 0 }),
            }}
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2
                  className={`text-lg font-semibold cursor-pointer tracking-tighter transition-colors duration-300 ${getThemeText()}`}
                >
                  Filters
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSettings}
                    className={`h-8 px-2 transition-all duration-300 ${darkMode ? "text-stone-400 hover:text-stone-50 hover:bg-stone-800" : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={`text-sm font-medium tracking-tighter ${getThemeText()}`}>Custom text</Label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type your custom text..."
                  className={`w-full resize-none border border-stone-200 dark:border-stone-700 rounded-md p-3 text-sm tracking-tighter transition-all duration-300 ${getTransparentBg()} ${getThemeText()} placeholder:text-stone-500 min-h-[72px] focus:border-stone-300 dark:focus:border-stone-600`}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className={getControlStyles().label}>Text presets</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "Key symbols", label: "Key symbols" },
                    { id: "Names", label: "Names" },
                    { id: "Paragraph", label: "Paragraph" },
                    { id: "Brands", label: "Brands" },
                    { id: "Alphabet", label: "Alphabet" },
                  ].map((preset) => (
                    <Badge
                      key={preset.id}
                      variant={selectedTextPreset === preset.id ? "default" : "outline"}
                      className={`${getControlStyles().badge} ${
                        selectedTextPreset === preset.id
                          ? `${darkMode ? "bg-stone-50 text-stone-900" : "bg-stone-900 text-stone-50"}`
                          : `${darkMode ? "bg-stone-950 border-stone-700 text-stone-50 hover:bg-stone-800" : `${getThemeCardBg()} ${getThemeBorder()} ${getThemeText()} hover:bg-stone-100`}`
                      }`}
                      onClick={() => handleTextPresetChange(preset.id)}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={getControlStyles().label}>Font categories</Label>
                <div className="flex flex-wrap gap-2">
                  {["Sans", "Serif", "Display", "Mono", "Pixel", "Script"].map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className={`${getControlStyles().badge} ${
                        selectedCategories.includes(category)
                          ? `${darkMode ? "bg-stone-50 text-stone-900" : "bg-stone-900 text-stone-50"}`
                          : `${darkMode ? "bg-stone-950 border-stone-700 text-stone-50 hover:bg-stone-800" : `${getThemeCardBg()} ${getThemeBorder()} ${getThemeText()} hover:bg-stone-100`}`
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={getControlStyles().label}>Language support</Label>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((language) => (
                    <Badge
                      key={language}
                      variant={selectedLanguages.includes(language) ? "default" : "outline"}
                      className={`${getControlStyles().badge} ${
                        selectedLanguages.includes(language)
                          ? `${darkMode ? "bg-stone-50 text-stone-900" : "bg-stone-900 text-stone-50"}`
                          : `${darkMode ? "bg-stone-950 border-stone-700 text-stone-50 hover:bg-stone-800" : `${getThemeCardBg()} ${getThemeBorder()} ${getThemeText()} hover:bg-stone-100`}`
                      }`}
                      onClick={() => toggleLanguage(language)}
                    >
                      {language}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={getControlStyles().label}>Text size</Label>
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 relative">
                    {isFontSizeHovered && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-stone-900 text-white px-2 py-1 rounded text-xs z-50">
                        {fontSize[0]}px
                      </div>
                    )}
                    <Slider
                      value={fontSize}
                      onValueChange={handleFontSizeChange}
                      min={10}
                      max={120}
                      step={1}
                      className="w-full"
                      onMouseEnter={() => setIsFontSizeHovered(true)}
                      onMouseLeave={() => setIsFontSizeHovered(false)}
                    />
                  </div>
                  <Select value={presetSize} onValueChange={handlePresetSizeChange}>
                    <SelectTrigger className={`w-20 h-8 min-w-[80px] ${getDropdownStyles()}`}>
                      <SelectValue>{fontSize[0]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className={`${getDropdownStyles()} min-w-[80px]`}>
                      {presetSizes.map((size) => (
                        <SelectItem key={size} value={size.toString()} className={getDropdownItemStyles()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-tighter">Letter spacing</Label>
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 relative">
                    {isLetterSpacingHovered && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-stone-900 text-white px-2 py-1 rounded text-xs z-50">
                        {letterSpacing[0]}%
                      </div>
                    )}
                    <Slider
                      value={letterSpacing}
                      onValueChange={handleLetterSpacingChange}
                      min={-10}
                      max={30}
                      step={0.5}
                      className="w-full"
                      onMouseEnter={() => setIsLetterSpacingHovered(true)}
                      onMouseLeave={() => setIsLetterSpacingHovered(false)}
                    />
                  </div>
                  <Select value={presetLetterSpacing} onValueChange={handlePresetLetterSpacingChange}>
                    <SelectTrigger className={`w-20 h-8 min-w-[80px] ${getDropdownStyles()}`}>
                      <SelectValue>{letterSpacing[0]}%</SelectValue>
                    </SelectTrigger>
                    <SelectContent className={`${getDropdownStyles()} min-w-[80px]`}>
                      {letterSpacingPresets.map((spacing) => (
                        <SelectItem
                          key={spacing}
                          value={(spacing * 100).toString()}
                          className={getDropdownItemStyles()}
                        >
                          {spacing * 100}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-tighter">Line height</Label>
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 relative">
                    {isLineHeightHovered && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-stone-900 text-white px-2 py-1 rounded text-xs z-50">
                        {lineHeight[0] * 100}%
                      </div>
                    )}
                    <Slider
                      value={lineHeight}
                      onValueChange={handleLineHeightChange}
                      min={0.8}
                      max={3.0}
                      step={0.1}
                      className="w-full"
                      onMouseEnter={() => setIsLineHeightHovered(true)}
                      onMouseLeave={() => setIsLineHeightHovered(false)}
                    />
                  </div>
                  <Select value={presetLineHeight} onValueChange={handlePresetLineHeightChange}>
                    <SelectTrigger className={`w-20 h-8 min-w-[80px] ${getDropdownStyles()}`}>
                      <SelectValue>{lineHeight[0] * 100}%</SelectValue>
                    </SelectTrigger>
                    <SelectContent className={`${getDropdownStyles()} min-w-[80px]`}>
                      {lineHeightPresets.map((height) => (
                        <SelectItem key={height} value={(height * 100).toString()} className={getDropdownItemStyles()}>
                          {height * 100}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium tracking-tighter">Weight</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {getAvailableWeights().map((weight) => (
                      <button
                        key={weight}
                        onClick={() => handleWeightChange(weight)}
                        className={`px-3 py-1 text-xs border tracking-tighter transition-colors rounded-full h-6 min-w-[48px] ${
                          fontWeight[0] === weight
                            ? `${darkMode ? "bg-stone-50 text-stone-900 border-stone-50" : "bg-stone-900 text-stone-50 border-stone-900"}`
                            : `${darkMode ? "bg-stone-950/80 text-stone-50 border-stone-700 hover:bg-stone-800" : `${getThemeCardBg()} ${getThemeText()} ${getThemeBorder()} hover:bg-stone-100`}`
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-styles" className={`text-sm font-medium tracking-tighter ${getThemeText()}`}>
                  Up to {maxStyles[0]} styles
                </Label>
                <Slider
                  value={maxStyles}
                  onValueChange={handleMaxStylesChange}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="font-type" className={`text-sm font-medium tracking-tighter ${getThemeText()}`}>
                  Variable font only
                </Label>
                <Switch
                  id="font-type"
                  checked={fontType}
                  onCheckedChange={handleFontTypeChange}
                  className={`data-[state=checked]:bg-stone-900 data-[state=unchecked]:bg-stone-200 ${
                    darkMode
                      ? "data-[state=checked]:bg-stone-200 data-[state=unchecked]:bg-stone-700"
                      : "data-[state=checked]:bg-stone-900 data-[state=unchecked]:bg-stone-200"
                  }`}
                />
              </div>
            </div>
            <div
              className={`absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent ${darkMode ? "hover:bg-stone-700" : "hover:bg-stone-300"} transition-colors`}
              onMouseDown={handleMouseDown}
            />
          </aside>
          <main
            className={`flex-1 px-6 py-8 transition-all duration-500 ${getThemeBackground()} ${
              isMobile ? "w-full" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {!sidebarVisible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarVisible(true)}
                    className={`flex items-center gap-2 h-8 px-3 transition-all duration-300 ${
                      darkMode
                        ? "text-stone-400 hover:text-stone-50 hover:bg-stone-800"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <Menu className="w-4 h-4" />
                    <span className="text-sm tracking-tighter">Filters</span>
                  </Button>
                )}
                <div
                  className={`text-sm tracking-tighter transition-colors duration-300 ${darkMode ? "text-stone-400" : "text-stone-500"}`}
                >
                  {sortedFonts.length} fonts
                </div>
              </div>
              <div className="flex items-center gap-1">
                {["new", "styles", "a-z"].map((sort) => (
                  <Button
                    key={sort}
                    variant={sortBy === sort ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleSortChange(sort)}
                    className={`h-7 px-2 text-xs tracking-[0] transition-all duration-200 ${
                      sortBy === sort
                        ? `${darkMode ? `${getColorThemeClasses().darkText} bg-stone-900` : `${getThemeText()} ${getColorThemeClasses().lightBg}`}`
                        : `${getThemeText()} hover:${getThemeCardBg()}`
                    }`}
                  >
                    {sort === "styles" ? "# styles" : sort}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {sortedFonts.length === 0 ? (
                <div
                  className={`text-center py-12 transition-colors duration-300 ${darkMode ? "text-stone-400" : "text-stone-500"}`}
                >
                  <p className="text-lg tracking-tighter">No fonts match your current filters</p>
                  <p className="text-sm mt-2 tracking-tighter">Try adjusting your search criteria</p>
                </div>
              ) : (
                sortedFonts.map((font) => {
                  const isExpanded = expandedCards.includes(font.name)
                  return (
                    <div key={font.name} className="mb-8 transition-all duration-300">
                      <div className="transition-all duration-300 p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className={`font-semibold text-lg tracking-tighter ${getThemeText()}`}>{font.name}</h3>
                            <span className={`text-sm tracking-tighter ${getThemeAccent()}`}>
                              by {font.foundry || "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm tracking-tighter ${getThemeAccent()}`}>{font.styles} styles</span>
                            {font.isVariable && (
                              <Badge
                                variant="secondary"
                                className={`text-xs px-2 py-0.5 tracking-tighter ${
                                  darkMode ? "bg-stone-800 text-stone-200" : "bg-stone-200 text-stone-700"
                                }`}
                              >
                                Variable
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs tracking-tighter transition-all duration-300 ${
                                darkMode
                                  ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                              }`}
                            >
                              Download
                            </Button>
                          </div>
                        </div>

                        <div className="py-4">
                          <textarea
                            value={getPreviewText(font.name)}
                            onChange={(e) => {
                              if (selectedTextPreset !== "Names") {
                                setPreviewText(e.target.value)
                                setCustomText(e.target.value)
                              }
                            }}
                            readOnly={selectedTextPreset === "Names"}
                            onClick={() => {
                              if (!isExpanded) {
                                setExpandedCards((prev) => [...prev, font.name])
                              }
                            }}
                            className={`w-full resize-none border-0 bg-transparent p-4 focus:outline-none focus:ring-0 tracking-[0em] transition-all duration-300 ${getThemeText()} overflow-hidden uploaded-font`}
                            data-font-family={font.family}
                            style={{
                              fontSize: `${fontSize[0]}px`,
                              fontWeight: selectedWeight,
                              textAlign: textAlign,
                              letterSpacing: `${letterSpacing[0] / 100}em`,
                              lineHeight: lineHeight[0],
                              minHeight: "64px",
                              height: "auto",
                              ...getVariableFontStyle(font),
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto"
                                el.style.height = Math.max(64, el.scrollHeight) + "px"
                              }
                            }}
                          />
                        </div>

                        {isExpanded && (
                          <div className="space-y-4 pt-4 animate-in fade-in duration-300">
                            {font.isVariable && font.variableAxes && (
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-4">
                                  {font.variableAxes.map((axis) => (
                                    <div key={axis.axis} className="flex items-center gap-2">
                                      <span className={`text-xs ${getThemeText()} min-w-[40px]`}>{axis.name}</span>
                                      <Slider
                                        value={[variableAxisValues[font.name]?.[axis.axis] || axis.default]}
                                        onValueChange={(value) => {
                                          setVariableAxisValues((prev) => ({
                                            ...prev,
                                            [font.name]: {
                                              ...prev[font.name],
                                              [axis.axis]: value[0],
                                            },
                                          }))
                                        }}
                                        min={axis.min}
                                        max={axis.max}
                                        step={axis.axis === "wght" ? 1 : 0.1}
                                        className="w-24"
                                      />
                                      <span className={`text-xs ${getThemeAccent()} min-w-[30px] text-right`}>
                                        {variableAxisValues[font.name]?.[axis.axis] || axis.default}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {font.openTypeFeatures.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-1">
                                  {font.openTypeFeatures.map((feature) => (
                                    <button
                                      key={feature}
                                      onClick={() => {
                                        const fontFeatureKey = `${font.name}-${feature}`
                                        setActiveOpenTypeFeatures((prev) =>
                                          prev.includes(fontFeatureKey)
                                            ? prev.filter((f) => f !== fontFeatureKey)
                                            : [...prev, fontFeatureKey],
                                        )
                                      }}
                                      className={`text-xs px-2 py-1 rounded-full transition-opacity duration-200 ${
                                        activeOpenTypeFeatures.includes(`${font.name}-${feature}`)
                                          ? `${darkMode ? "bg-stone-200 text-stone-900" : "bg-stone-900 text-stone-50"}`
                                          : `${darkMode ? "bg-stone-800 text-stone-200 hover:bg-stone-700" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`
                                      }`}
                                    >
                                      {feature}
                                    </button>
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

        <footer
          className={`border-t transition-colors duration-300 ${darkMode ? "bg-stone-950/90 backdrop-blur-sm border-stone-800" : `${getThemeCardBg()}/90 backdrop-blur-sm ${getThemeBorder()}`}`}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div
              className={`text-center text-sm transition-colors duration-300 ${darkMode ? "text-stone-400" : "text-stone-600"}`}
            >
              © Baseline, 2025 / Made by Magic x Logic
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
