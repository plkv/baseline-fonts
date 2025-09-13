  // Placeholder function - now handled by useEffect
  const highlightMissingCharacters = (text: string, fontId: number) => {
    return text
  }

  const handlePreviewEdit = (element: HTMLDivElement, newText: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setCustomText(newText)
      return
    }
    
    const range = selection.getRangeAt(0)
    const cursorOffset = range.startOffset

    // Store the cursor position before state update
    const preserveCursor = () => {
      requestAnimationFrame(() => {
        if (element && selection) {
          try {
            let textNode = element.firstChild
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              const newRange = document.createRange()
              const safeOffset = Math.min(cursorOffset, textNode.textContent?.length || 0)
              newRange.setStart(textNode, safeOffset)
              newRange.setEnd(textNode, safeOffset)
              selection.removeAllRanges()
              selection.addRange(newRange)
            } else {
              // If no text node exists, create one and position cursor
              if (element.textContent !== newText) {
                element.textContent = newText
                textNode = element.firstChild
                if (textNode) {
                  const newRange = document.createRange()
                  const safeOffset = Math.min(cursorOffset, newText.length)
                  newRange.setStart(textNode, safeOffset)
                  newRange.setEnd(textNode, safeOffset)
                  selection.removeAllRanges()
                  selection.addRange(newRange)
                }
              }
            }
          } catch (error) {
            console.warn('Cursor position restoration failed:', error)
            element.focus()
          }
        }
      })
    }

    setCustomText(newText)
    preserveCursor()
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
    // Sync italic axis to preview italic flag
    if (axis === 'ital') {
      const isItal = Number(value) >= 1
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: { ...(prev[fontId] || { weight: 400, italic: false }), italic: isItal },
      }))
    }
    if (axis === 'slnt') {
      const isItal = Math.abs(Number(value)) > 0.01
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: { ...(prev[fontId] || { weight: 400, italic: false }), italic: isItal },
      }))
    }
  }

  const getEffectiveStyle = (fontId: number) => {
    const font = fonts.find(f => f.id === fontId)
    const fontSelection = fontWeightSelections[fontId] || { weight: 400, italic: false }
    const stateAxes = fontVariableAxes[fontId] || {}
    const otFeatures = fontOTFeatures[fontId] || {}
    const isFamilyVariable = (font?.type === 'Variable') || !!(font?.variableAxes && font.variableAxes.length)

    // Base axes: ensure variable fonts always carry an explicit wght so browser doesn't use font's internal default
    const axesOut: Record<string, number> = { ...stateAxes }
    if (isFamilyVariable && axesOut.wght == null) {
      axesOut.wght = selectedWeights.length > 0 ? selectedWeights[0] : (fontSelection.weight || 400)
    }

    // Resolve weight/italic with sidebar filters taking precedence when set
    const weight = selectedWeights.length > 0
      ? selectedWeights[0]
      : (axesOut.wght || fontSelection.weight || 400)
    // If variable italic axes present, derive italic from axes when meaningful
    let italic = isItalic || fontSelection.italic || false
    if (isFamilyVariable) {
      const italVal = Number(stateAxes['ital'])
      const slntVal = Number(stateAxes['slnt'])
      if (isFinite(italVal)) italic = italic || italVal >= 1
      if (isFinite(slntVal)) italic = italic || Math.abs(slntVal) > 0.01
    }

    const result = { weight, italic, variableAxes: axesOut, otFeatures }
    return result
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

  // Removed special font readiness and reporting; render normally

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--gray-surface-prim)" }}>
      {/* Dynamic font loading and fallback character styles */}
      <style dangerouslySetInnerHTML={{ __html: `.fallback-char{opacity:.4!important;color:var(--gray-cont-tert)!important;}` }} />
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
                <h3 className="text-sidebar-title mb-3">Text presets</h3>
                <div className="flex flex-wrap gap-2">
                  {textPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedPreset(preset)
                        if (preset === "Paragraph") setTextSize([20]); else setTextSize([72])
                        if (preset === "Names") setCustomText(""); else if (fonts[0]) setCustomText(getPresetContent(preset, fonts[0].name))
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
                          fontFamily: getStablePreviewFontForCollection(mode),
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
                    step={1}
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
              <button onClick={() => handleSort("Random")} className={`btn-sm ${sortBy === "Random" ? "active" : ""}`}>
                Random
              </button>
              <button onClick={() => handleSort("Date")} className={`btn-sm ${sortBy === "Date" ? "active" : ""}`}>
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
                    italic: defaultStyle.isItalic,
                    cssFamily: (defaultStyle as any).cssFamily,
                    styleName: defaultStyle.styleName,
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
                          {font._availableStyles && font._availableStyles.length > 1 ? (
                            <div className="dropdown-wrap">
                              <select
                                ref={(el) => { selectRefs.current[font.id] = el }}
                                value={`${fontSelection.weight}|${fontSelection.italic}|${fontSelection.cssFamily || ''}`}
                                onChange={(e) => {
                                  const [weight, italic, cssFamily] = e.target.value.split("|")
                                  updateFontSelection(font.id, Number.parseInt(weight), italic === "true", cssFamily)
                                  setFontVariableAxes(prev => ({ ...prev, [font.id]: { ...prev[font.id], wght: Number.parseInt(weight) } }))
                                }}
                                className={`dropdown-select text-sidebar-title appearance-none`}
                              >
                                {font._availableStyles?.map((style, index) => (
                                  <option key={`${style.weight}-${style.isItalic}-${index}`} value={`${style.weight}|${style.isItalic}|${(style as any).cssFamily || ''}`}>
                                    {style.styleName}
                                  </option>
                                ))}
                              </select>
                              <span className="material-symbols-outlined dropdown-icon" style={{ fontWeight: 300, fontSize: "20px", pointerEvents: 'none' }}>expand_more</span>
                            </div>
                          ) : (
                            <div className="dropdown-wrap" aria-disabled>
                              <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)', padding: '6px 10px' }}>Single Style</div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-author">
                            {(() => {
                              const count = (font._availableStyles?.length || font.styles || 1)
                              return `${font.type}, ${count} style${count !== 1 ? 's' : ''}`
                            })()}
                          </span>
                          <span className="text-author">by {font.author}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      {(() => {
                        // Check if any font in the family has a download link set in admin (not the blob URL)
                        const adminDownloadLink = font.downloadLink || font._familyFonts?.find(f => f.downloadLink && f.downloadLink.trim() !== '')?.downloadLink
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
                    </div>
                    <div className="relative">
                      <ControlledPreviewInput
                      value={getPreviewContent(font.name)}
                      onChangeText={(val, pos) => {
                        // Only set global customText when user actually changes text
                        // Avoid setting it on focus/cursor events that pass the same value
                        setTextCursorPosition(pos)
                        if (val !== customText) {
                          // If preset is in effect (customText empty) and val equals preset content, skip
                          const presetValue = getPresetContent(selectedPreset, font.name)
                          const isPreset = customText.trim() === '' && val === presetValue
                          if (!isPreset) setCustomText(val)
                        }
                      }}
                      cursorPosition={textCursorPosition}
                      className="whitespace-pre-line break-words cursor-text focus:outline-none w-full bg-transparent border-0"
                      style={{
                        fontSize: `${textSize[0]}px`,
                        lineHeight: `${lineHeight[0]}%`,
                        fontFamily: (fontWeightSelections[font.id]?.cssFamily ? `"${fontWeightSelections[font.id]?.cssFamily}", system-ui, sans-serif` : font.fontFamily),
                        fontWeight: effectiveStyle.weight,
                        fontStyle: effectiveStyle.italic ? "italic" : "normal",
                        color: "var(--gray-cont-prim)",
                        opacity: 1,
                        fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures || {}),
                        fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes || {}),
                      }}
                      onToggleExpand={() => toggleCardExpansion(font.id)}
                      fontId={font.id}
                      />

                      {/* No bullet overlay while loading */}
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
                                        onValueChange={(value) => {
                                          let v = value[0]
                                          if (axis.tag === 'slnt') {
                                            // avoid sticky min edge on drag
                                            if (Math.abs(v - axis.min) < 0.01) v = axis.min + 0.01
                                          }
                                          if (axis.tag === 'ital') {
                                            // snap near 0 or 1 for stability
                                            if (v < 0.1) v = 0
                                            else if (v > 0.9) v = 1
                                          }
                                          updateVariableAxis(font.id, axis.tag, v)
                                        }}
                                        min={axis.min}
                                        max={axis.max}
                                        step={axis.tag === "wght" ? 1 : 0.5}
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
                  © typedump, 2025–Future
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
