import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Montserrat } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { Toast } from "@/components/Toast"
import { AuthProvider } from "@/contexts/AuthContext"

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
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${playfair.variable} ${montserrat.variable} font-montserrat bg-cream`}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen pt-20">{children}</main>
          <Toast />
        </AuthProvider>
      </body>
    </html>
  )
}
