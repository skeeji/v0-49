import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Galerie de Luminaires - Du Moyen Âge à nos jours",
  description: "Découvrez une collection exceptionnelle de luminaires historiques avec recherche par image IA",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Toaster position="top-right" richColors closeButton duration={4000} />
        </AuthProvider>
      </body>
    </html>
  )
}
