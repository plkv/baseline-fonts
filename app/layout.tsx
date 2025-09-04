import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Typedump - Font Collection & Preview",
  description: "Discover, preview, and manage typography with Typedump - the ultimate font collection platform for designers and developers.",
  keywords: "fonts, typography, typefaces, font preview, design tools, web fonts",
  openGraph: {
    title: "Typedump - Font Collection & Preview",
    description: "Discover, preview, and manage typography with Typedump - the ultimate font collection platform for designers and developers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Typedump - Font Collection & Preview",
    description: "Discover, preview, and manage typography with Typedump - the ultimate font collection platform for designers and developers.",
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      style={{
        fontFeatureSettings: "'ss01' on, 'ss03' on, 'cv06' on, 'cv11' on",
      }}
    >
      <body className="font-sans">{children}</body>
    </html>
  )
}
