"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { UserMenu } from "@/components/UserMenu"
import { LoginModal } from "@/components/LoginModal"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { user, userData, logout } = useAuth()

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

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              {logoUrl ? (
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Logo</span>
                </div>
              )}
            </Link>

            {/* Navigation desktop */}
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
              {userData?.role === "admin" && (
                <Link href="/import" className="text-gray-700 hover:text-orange-500 transition-colors">
                  Import
                </Link>
              )}
            </nav>

            {/* Actions utilisateur */}
            <div className="flex items-center space-x-4">
              {user ? (
                <UserMenu user={user} userData={userData} onLogout={handleLogout} />
              ) : (
                <Button
                  onClick={() => setIsLoginModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="hidden md:flex"
                >
                  <User className="w-4 h-4 mr-2" />
                  Connexion
                </Button>
              )}

              {/* Menu mobile */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsDrawerOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation mobile */}
      <DrawerNav
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        userData={userData}
        onLogin={() => {
          setIsDrawerOpen(false)
          setIsLoginModalOpen(true)
        }}
        onLogout={handleLogout}
      />

      {/* Modal de connexion */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
