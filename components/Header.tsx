"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { LoginModal } from "@/components/LoginModal"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { user, logout } = useAuth()

  // Charger le logo personnalisé
  useEffect(() => {
    async function loadLogo() {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const logoBlob = await response.blob()
          const logoObjectUrl = URL.createObjectURL(logoBlob)
          setLogoUrl(logoObjectUrl)
        }
      } catch (error) {
        console.log("Aucun logo personnalisé trouvé, utilisation du logo par défaut")
      }
    }

    loadLogo()

    // Nettoyer l'URL d'objet lors du démontage
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl)
      }
    }
  }, [])

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const handleLoginClick = () => {
    setIsLoginModalOpen(true)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              {logoUrl ? (
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  width={120}
                  height={40}
                  className="h-8 w-auto object-contain"
                  onError={() => {
                    console.log("Erreur chargement logo personnalisé, fallback vers le texte")
                    setLogoUrl(null)
                  }}
                />
              ) : (
                <span className="text-2xl font-playfair text-dark">GERSAINT PARIS</span>
              )}
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/luminaires" className="text-gray-700 hover:text-orange-500 transition-colors">
                Luminaires
              </Link>
              <Link href="/designers" className="text-gray-700 hover:text-orange-500 transition-colors">
                Designers
              </Link>
              <Link href="/chronologie" className="text-gray-700 hover:text-orange-500 transition-colors">
                Chronologie
              </Link>
            </nav>

            {/* Actions Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/luminaires">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-orange-500">
                  <Search className="w-4 h-4" />
                </Button>
              </Link>

              {user ? (
                <UserMenu user={user} onLogout={handleLogout} />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoginClick}
                  className="text-gray-700 hover:text-orange-500"
                >
                  <User className="w-4 h-4 mr-2" />
                  Connexion
                </Button>
              )}
            </div>

            {/* Menu Mobile */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={toggleDrawer}>
              {isDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Drawer Navigation Mobile */}
      <DrawerNav
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLoginClick={handleLoginClick}
        onLogout={handleLogout}
      />

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
