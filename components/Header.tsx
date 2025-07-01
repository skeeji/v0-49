"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")
  const { user, userData, logout } = useAuth()

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.logo) {
            setLogoUrl(`/api/logo?t=${Date.now()}`)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
      }
    }

    loadLogo()
  }, [])

  const navigation = [
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
  ]

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }

  return (
    <>
      <header className="bg-white/95 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-32">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src={logoUrl || "/placeholder.svg"}
                alt="Logo"
                width={128}
                height={128}
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-logo.svg"
                }}
              />
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative text-lg font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200 py-2"
                >
                  {item.name}
                  <span
                    className="absolute bottom-0 left-0 w-full h-0.5 rounded-full transition-all duration-200 opacity-0 hover:opacity-100"
                    style={{ backgroundColor: "#d4a574" }}
                  ></span>
                </Link>
              ))}
            </nav>

            {/* Actions utilisateur */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">{userData?.email || user.email}</span>
                    {userData?.role && (
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: "#d4a574" }}
                      >
                        {userData.role}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 text-slate-600 hover:text-slate-800 bg-transparent"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowLoginModal(true)}
                  className="text-white"
                  style={{ backgroundColor: "#d4a574" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
                >
                  Connexion
                </Button>
              )}
            </div>

            {/* Menu mobile */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200">
            <div className="px-4 py-4 space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-lg font-medium text-slate-700 hover:text-slate-900 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <div className="pt-4 border-t border-slate-200">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">{userData?.email || user.email}</span>
                      {userData?.role && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: "#d4a574" }}
                        >
                          {userData.role}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center space-x-1 text-slate-600 hover:text-slate-800 bg-transparent"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setShowLoginModal(true)
                      setIsMenuOpen(false)
                    }}
                    className="w-full text-white"
                    style={{ backgroundColor: "#d4a574" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
                  >
                    Connexion
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}
