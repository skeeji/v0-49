import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
})
const interCoach = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-coach",
})

export const metadata: Metadata = {
  title: "Dubai J-2 · Coach",
  description: "Coach d'anglais professionnel pour l'éclairage retail de luxe.",
}

export default function EnglishCoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${interCoach.variable}`}>
      {children}
    </div>
  )
}
