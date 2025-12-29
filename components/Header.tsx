"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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
    { href: "/recherche", label: "Recherche" }, // Ajout du lien Recherche dans la navigation
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
      <header
        className="bg-[#F8F8F8] shadow-sm border-b border-gray-200 sticky top-0 z-40 h-20"
        style={{
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full md:grid md:grid-cols-3 md:gap-4">
            {/* Navigation gauche - desktop only */}
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.slice(0, Math.ceil(navItems.length / 2)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[#666666] hover:text-[#8b7355] font-normal transition-colors py-4 block ${
                    isActivePage(item.href) ? "text-[#8b7355]" : ""
                  }`}
                  style={{ fontSize: "16px" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Logo centré */}
            <Link href="/" className="flex items-center justify-center">
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

            {/* Navigation droite et actions - desktop */}
            <div className="hidden md:flex items-center justify-end space-x-6">
              {navItems.slice(Math.ceil(navItems.length / 2)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[#666666] hover:text-[#8b7355] font-normal transition-colors py-4 block ${
                    isActivePage(item.href) ? "text-[#8b7355]" : ""
                  }`}
                  style={{ fontSize: "16px" }}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <UserMenu />
              ) : (
                <Button
                  onClick={signInWithGoogle}
                  className="text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg border border-[#8b7355]"
                  style={{
                    backgroundColor: "#8b7355",
                    fontSize: "16px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#75614a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                >
                  Connexion
                </Button>
              )}
            </div>

            {/* Actions mobile - à droite */}
            <div className="flex items-center space-x-4 ml-auto md:hidden">
              {user && <UserMenu />}

              <Button
                variant="ghost"
                size="sm"
                className="text-[#666666]"
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
