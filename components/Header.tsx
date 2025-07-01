"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const pathname = usePathname()
  const { user, userData } = useAuth()

  // Charger le logo depuis l'API
  useEffect(() => {
    const loadLogo = async () => {
      try {
        console.log("🔍 Chargement du logo...")
        const response = await fetch("/api/logo")
        const data = await response.json()

        console.log("📊 Réponse logo API:", data)

        if (data.success && data.logoUrl) {
          console.log("✅ Logo trouvé:", data.logoUrl)
          setLogoUrl(data.logoUrl)
        } else {
          console.log("⚠️ Pas de logo personnalisé, utilisation du placeholder")
          setLogoUrl("/placeholder-logo.svg")
        }
      } catch (error) {
        console.error("❌ Erreur chargement logo:", error)
        setLogoUrl("/placeholder-logo.svg")
      }
    }

    loadLogo()
  }, [])

  const navigation = [
    { name: "Accueil", href: "/" },
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
    { name: "Import", href: "/import" },
  ]

  const isActivePage = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            {logoUrl && (
              <div className="relative w-10 h-10">
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    console.log("❌ Erreur affichage logo, fallback vers placeholder")
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder-logo.svg"
                  }}
                />
              </div>
            )}
            <span className="text-xl font-serif text-gray-900">Galerie Luminaires</span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActivePage(item.href) ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.name}
                {isActivePage(item.href) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200"
                    style={{ backgroundColor: "#f2d895" }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {userData?.role === "admin" && (
                  <span
                    className="px-2 py-1 text-xs font-medium text-white rounded-full"
                    style={{ backgroundColor: "#f2d895" }}
                  >
                    Admin
                  </span>
                )}
                <UserMenu />
              </div>
            ) : (
              <Button
                className="text-white transition-all duration-200"
                style={{ backgroundColor: "#f2d895" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
              >
                Connexion
              </Button>
            )}
          </div>

          {/* Menu Mobile */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Navigation Mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActivePage(item.href)
                      ? "text-gray-900 bg-gray-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200">
                {user ? (
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center space-x-2">
                      {userData?.role === "admin" && (
                        <span
                          className="px-2 py-1 text-xs font-medium text-white rounded-full"
                          style={{ backgroundColor: "#f2d895" }}
                        >
                          Admin
                        </span>
                      )}
                      <UserMenu />
                    </div>
                  </div>
                ) : (
                  <div className="px-3">
                    <Button
                      className="w-full text-white transition-all duration-200"
                      style={{ backgroundColor: "#f2d895" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
                    >
                      Connexion
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
