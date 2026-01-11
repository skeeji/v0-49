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
    { href: "/recherche", label: "Recherche" },
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

  const leftNavItems = navItems.slice(0, 3)
  const rightNavItems = navItems.slice(3)

  return (
    <>
      <header
        className="bg-[#F8F8F8] shadow-sm border-b border-gray-200 sticky top-0 z-40"
        style={{
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div className="container mx-auto px-6 py-4 md:py-6">
          <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:gap-12">
            {/* Navigation gauche - desktop only */}
            <nav className="hidden md:flex items-center justify-end space-x-8">
              {leftNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hover:text-[#8b7355] font-normal transition-colors no-underline ${
                    isActivePage(item.href) ? "text-[#8b7355]" : "text-[#666666]"
                  }`}
                  style={{ fontSize: "16px", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/" className="flex items-center justify-center no-underline">
              <div className="w-28 h-12 md:w-40 md:h-16 relative">
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-logo.svg"
                  }}
                />
              </div>
            </Link>

            {/* Navigation droite et actions - desktop */}
            <div className="hidden md:flex items-center justify-start space-x-8">
              {rightNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hover:text-[#8b7355] font-normal transition-colors no-underline ${
                    isActivePage(item.href) ? "text-[#8b7355]" : "text-[#666666]"
                  }`}
                  style={{ fontSize: "16px", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <UserMenu />
              ) : (
                <Button
                  onClick={signInWithGoogle}
                  className="text-white font-semibold px-5 py-2 rounded-lg transition-all duration-200 hover:shadow-lg border border-[#8b7355] no-underline"
                  style={{
                    backgroundColor: "#8b7355",
                    fontSize: "16px",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#75614a")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                >
                  Connexion
                </Button>
              )}
            </div>

            {/* Actions mobile */}
            <div className="flex items-center space-x-4 md:hidden">
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

      <DrawerNav isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} navItems={navItems} />
    </>
  )
}
