"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { UserMenu } from "@/components/UserMenu"
import { LoginModal } from "@/components/LoginModal"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { user, userData } = useAuth()

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        const data = await response.json()
        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl)
        }
      } catch (error) {
        console.error("Erreur chargement logo:", error)
      }
    }

    fetchLogo()
  }, [])

  const navigation = [
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
  ]

  if (userData?.role === "admin") {
    navigation.push({ name: "Import", href: "/import" })
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl || "/placeholder.svg"}
                alt="Logo"
                width={128}
                height={128}
                className="w-32 h-32 object-contain"
                priority
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-500 text-sm">Logo</span>
              </div>
            )}
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-orange-500 font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                style={{ backgroundColor: "#f2d895", color: "#000" }}
                className="hover:opacity-90"
              >
                Se connecter
              </Button>
            )}

            {/* Menu mobile */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-orange-500 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Modal de connexion */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  )
}
