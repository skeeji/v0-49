"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./UserMenu"
import { LoginModal } from "./LoginModal"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        const data = await response.json()
        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl)
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
      }
    }

    fetchLogo()
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 h-24">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              {logoUrl ? (
                <img src={logoUrl || "/placeholder.svg"} alt="Logo" className="w-32 h-32 object-contain" />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Logo</span>
                </div>
              )}
            </Link>

            {/* Navigation Desktop */}
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
              <Link href="/import" className="text-gray-700 hover:text-gray-900 font-medium">
                Import
              </Link>
            </nav>

            {/* User Menu / Login */}
            <div className="hidden md:flex items-center">
              {user ? (
                <UserMenu />
              ) : (
                <Button onClick={() => setIsLoginOpen(true)} variant="outline">
                  Se connecter
                </Button>
              )}
            </div>

            {/* Menu Mobile */}
            <button onClick={toggleMenu} className="md:hidden p-2">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Navigation Mobile */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-24 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
              <nav className="flex flex-col space-y-4 p-4">
                <Link
                  href="/luminaires"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Luminaires
                </Link>
                <Link
                  href="/designers"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Designers
                </Link>
                <Link
                  href="/chronologie"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Chronologie
                </Link>
                <Link
                  href="/import"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Import
                </Link>
                <div className="pt-4 border-t border-gray-200">
                  {user ? (
                    <UserMenu />
                  ) : (
                    <Button onClick={() => setIsLoginOpen(true)} variant="outline" className="w-full">
                      Se connecter
                    </Button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  )
}
