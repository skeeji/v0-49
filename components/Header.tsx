"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")
  const pathname = usePathname()
  const { user, userData } = useAuth()

  // Charger le logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        console.log("🔍 Chargement du logo...")
        const response = await fetch("/api/logo")
        const data = await response.json()

        if (data.success && data.logoUrl) {
          console.log("✅ Logo chargé:", data.logoUrl)
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
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
    ...(userData?.role === "admin" ? [{ name: "Import", href: "/import" }] : []),
  ]

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true
    if (href !== "/" && pathname.startsWith(href)) return true
    return false
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
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
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href) ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200"
                    style={{ backgroundColor: "#f2d895" }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <Button style={{ backgroundColor: "#f2d895", color: "#000" }} className="hover:opacity-90" size="sm">
                Connexion
              </Button>
            )}

            {/* Menu mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
