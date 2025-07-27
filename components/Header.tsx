"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, X, User, LogOut, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [logo, setLogo] = useState("")

  const { user, userData, logout } = useAuth()

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.logo) {
            setLogo(`/api/images/${data.logo._id}`)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
      }
    }

    loadLogo()
  }, [])

  const navigation = [
    { name: "Accueil", href: "/" },
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
    { name: "Tarifs", href: "/pricing" }, // CORRECTION: Ajout du lien vers la page de tarifs
  ]

  const handleLogout = async () => {
    await logout()
    setIsUserMenuOpen(false)
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              {logo ? (
                <Image
                  src={logo || "/placeholder.svg"}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
              )}
              <span className="text-xl font-serif font-semibold text-gray-900">Luminaires</span>
            </Link>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Actions utilisateur */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block text-sm font-medium">
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                    {userData?.role === "premium" && <Crown className="w-4 h-4 text-yellow-500" />}
                  </Button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || "Utilisateur"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          {userData?.role === "free" && "Compte gratuit"}
                          {userData?.role === "premium" && "Premium"}
                          {userData?.role === "admin" && "Administrateur"}
                        </p>
                      </div>

                      {userData?.role === "free" && (
                        <Link
                          href="/pricing"
                          className="flex items-center px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Passer à Premium
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Se déconnecter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button onClick={() => setShowLoginModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Se connecter
                </Button>
              )}

              {/* Menu mobile */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Navigation mobile */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col space-y-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-gray-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Modal de connexion */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}
