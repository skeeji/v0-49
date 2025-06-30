"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu } from "lucide-react"
import { DrawerNav } from "./DrawerNav"
import { UserMenu } from "./UserMenu"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { userData } = useAuth()

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        console.log("🔍 Chargement du logo...")
        const response = await fetch("/api/logo")
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setLogoUrl(url)
          console.log("✅ Logo chargé avec succès")
        } else {
          console.log("❌ Aucun logo trouvé")
        }
      } catch (error) {
        console.error("❌ Erreur chargement logo:", error)
      }
    }

    fetchLogo()

    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl)
      }
    }
  }, [])

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-28 flex items-center">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <Link href="/" className="flex items-center space-x-4">
            {logoUrl ? (
              <Image
                src={logoUrl || "/placeholder.svg"}
                alt="Logo"
                width={120}
                height={120}
                className="w-28 h-28 object-contain"
                onError={(e) => {
                  console.error("❌ Erreur affichage logo")
                  e.currentTarget.style.display = "none"
                }}
              />
            ) : (
              <div className="w-28 h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
            )}
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/luminaires" className="text-gray-700 hover:text-gray-900 font-medium">
              Luminaires
            </Link>
            <Link href="/designers" className="text-gray-700 hover:text-gray-900 font-medium">
              Designers
            </Link>
            <Link href="/chronologie" className="text-gray-700 hover:text-gray-900 font-medium">
              Chronologie
            </Link>
            {userData?.role === "admin" && (
              <Link href="/import" className="text-gray-700 hover:text-gray-900 font-medium">
                Import
              </Link>
            )}
          </nav>

          {/* Menu utilisateur et bouton mobile */}
          <div className="flex items-center space-x-4">
            <UserMenu />

            {/* Bouton menu mobile */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <DrawerNav isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </header>
  )
}
