"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { useAuth } from "@/contexts/AuthContext"
import { UserMenu } from "@/components/UserMenu"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")
  const { user, userData, signInWithGoogle } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

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

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === "/") {
      // Si on est déjà sur la page d'accueil, on recharge la page
      window.location.reload()
    } else {
      // Sinon on navigue vers la page d'accueil
      router.push("/")
    }
  }

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

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 h-20">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Taille encore plus grande */}
            <a href="/" onClick={handleLogoClick} className="flex items-center cursor-pointer">
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
            </a>

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
                <UserMenu />
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
