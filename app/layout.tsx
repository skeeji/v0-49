import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { AuthProvider } from "@/contexts/AuthContext"
import { SelectionProvider } from "@/contexts/SelectionContext"
import { Toaster } from "sonner"
import { SelectionSidebar } from "@/components/SelectionSidebar"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  title: "Galerie de Luminaires - Collection Historique",
  description: "Découvrez une collection unique de luminaires historiques du Moyen Âge à nos jours avec recherche IA",
  keywords: "luminaires, collection, historique, antiquités, design, éclairage",
  generator: "v0.dev",
  other: {
    "pinterest": "nopin",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased bg-white">
        <AuthProvider>
          <SelectionProvider>
            <Header />
            <main>{children}</main>
            <SelectionSidebar />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "white",
                  border: "1px solid #e2e8f0",
                  color: "#1e293b",
                },
              }}
            />
          </SelectionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
