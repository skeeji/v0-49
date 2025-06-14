import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Montserrat } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "Galerie Luminaires Design",
  description: "Collection de luminaires design et contemporains",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${playfair.variable} ${montserrat.variable} font-montserrat bg-cream`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Header />
            <main className="min-h-screen pt-20">{children}</main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
