"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, Search, Upload, Clock, Users, Home } from "lucide-react"
import { DrawerNav } from "./DrawerNav"
import { SearchBar } from "./SearchBar"
import { UserMenu } from "./UserMenu"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoFilename, setLogoFilename] = useState<string | null>(null)
  const { isFirebaseEnabled } = useAuth()

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  // CORRECTION: Charger le logo depuis l'API ou utiliser le logo par défaut
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Essayer de charger le logo depuis l'API
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.filename) {
            setLogoFilename(data.filename)
            console.log("🏷️ Logo personnalisé chargé:", data.filename)
          }
        }
      } catch (error) {
        console.log("ℹ️ Aucun logo personnalisé trouvé, utilisation du logo par défaut")
      }
    }

    loadLogo()
  }, [])

  const logoSrc = logoFilename ? `/api/images/filename/${logoFilename}` : "/images/gersaint-logo.png"

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et navigation mobile */}
            <div className="flex items-center">
              <button
                onClick={toggleDrawer}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <Link href="/" className="flex items-center ml-2 md:ml-0">
                <Image
                  src={logoSrc || "/placeholder.svg"}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="mr-3"
                  onError={(e) => {
                    // Fallback vers le logo par défaut en cas d'erreur
                    e.currentTarget.src = "/images/gersaint-logo.png"
                  }}
                />
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Gersaint</span>
              </Link>
            </div>

            {/* Navigation desktop */}
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Link>
              <Link
                href="/luminaires"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Search className="h-4 w-4 mr-2" />
                Luminaires
              </Link>
              <Link
                href="/designers"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Designers
              </Link>
              <Link
                href="/chronologie"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                Chronologie
              </Link>
              <Link
                href="/import"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Link>
            </nav>

            {/* Barre de recherche et menu utilisateur */}
            <div className="flex items-center space-x-4">
              <div className="hidden lg:block">
                <SearchBar />
              </div>

              {/* Afficher le menu utilisateur seulement si Firebase est configuré */}
              {isFirebaseEnabled && <UserMenu />}

              {/* Message si Firebase n'est pas configuré */}
              {!isFirebaseEnabled && <div className="text-sm text-gray-500 hidden sm:block">Mode hors ligne</div>}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation mobile drawer */}
      <DrawerNav isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
