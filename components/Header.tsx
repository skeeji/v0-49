"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, User, LogOut, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")
  const { user, userData, signInWithGoogle, logout } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json()
            if (data.success && data.logo && data.logo._id) {
              setLogoUrl(`/api/images/${data.logo._id}`)
            }
          } else {
            // L'API retourne directement l'image
            setLogoUrl("/api/logo")
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
        setLogoUrl("/placeholder-logo.svg")
      }
    }

    loadLogo()
  }, [])

  const navItems = [
    { href: "/luminaires", label: "Luminaires" },
    { href: "/designers", label: "Designers" },
    { href: "/chronologie", label: "Chronologie" },
    { href: "/pricing", label: "Tarifs" },
  ]

  if (userData?.role === "admin") {
    navItems.push({ href: "/import", label: "Import" })
  }

  const isActivePage = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const handleLogout = async () => {
    await logout()
    setIsUserMenuOpen(false)
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 h-20">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Taille encore plus grande */}
            <Link href="/" className="flex items-center">
              <div className="w-32 h-32 relative">
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-logo.svg"
                  }}
                />
              </div>
            </Link>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    className="text-gray-700 hover:text-gray-900 font-medium transition-colors font-serif py-4 block"
                  >
                    {item.label}
                  </Link>
                  {isActivePage(item.href) && (
                    <div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: "#f2d895" }}></div>
                  )}
                </div>
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
                <Button
                  onClick={signInWithGoogle}
                  className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: "#f2d895" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
                >
                  Connexion
                </Button>
              )}

              {/* Menu mobile */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      <DrawerNav isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} navItems={navItems} />
    </>
  )
}
