import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import Header from "@/components/Header"
import ChatWidget from "@/components/ChatWidget"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Galerie de Luminaires",
  description: "Découvrez notre collection de luminaires design",
    generator: 'v0.app'
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
          <main className="min-h-screen">{children}</main>
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  )
}
