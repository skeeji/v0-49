import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/Header"
import { Toast } from "@/components/ui/toast"
import { DrawerNav } from "@/components/DrawerNav"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Luminaires Gallery",
  description: "Découvrez des luminaires de toutes époques et styles",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DrawerNav />
          <Header />
          {children}
          <Toast />
        </ThemeProvider>
      </body>
    </html>
  )
}
