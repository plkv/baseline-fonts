"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FontPreviewProps {
  font: {
    name: string
    styles: number
    features: string[]
    category: string
    designer: string
  }
  previewText: string
  onTextChange: (text: string) => void
}

export function FontPreview({ font, previewText, onTextChange }: FontPreviewProps) {
  const getFontFamily = (fontName: string) => {
    const fontMap: { [key: string]: string } = {
      Inter: "Inter, system-ui, sans-serif",
      "Playfair Display": '"Playfair Display", serif',
      "Source Code Pro": '"Source Code Pro", monospace',
      Poppins: "Poppins, system-ui, sans-serif",
      Merriweather: "Merriweather, serif",
      "Roboto Mono": '"Roboto Mono", monospace',
    }
    return fontMap[fontName] || "system-ui, sans-serif"
  }

  return (
    <Card className="p-8 bg-card border-border hover:shadow-lg transition-shadow">
      {/* Font Metadata */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-1">{font.name}</h2>
            <p className="text-muted-foreground">by {font.designer}</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="mb-2">
              {font.styles} styles
            </Badge>
            <p className="text-sm text-muted-foreground">{font.category}</p>
          </div>
        </div>

        {/* OpenType Features */}
        <div className="flex flex-wrap gap-2">
          {font.features.map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>

      {/* Font Preview */}
      <div className="relative">
        <textarea
          value={previewText}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full bg-transparent border-none resize-none outline-none text-pretty leading-tight"
          style={{
            fontFamily: getFontFamily(font.name),
            fontSize: "120px",
            lineHeight: "1.1",
          }}
          rows={Math.ceil(previewText.length / 20)}
        />
      </div>
    </Card>
  )
}
