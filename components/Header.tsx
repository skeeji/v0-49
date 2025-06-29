"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Home, Lightbulb, Users, Clock, Upload } from "lucide-react"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"

export function Header() {
  const pathname = usePathname()
  const { userData } = useAuth()
  const isMobile = useIsMobile()
  const [logo, setLogo] = useState<string | null>(null)

  const isAdmin = userData?.role === "admin"

  const navigation = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Luminaires", href: "/luminaires", icon: Lightbulb },
    { name: "Designers", href: "/designers", icon: Users },
    { name: "Chronologie", href: "/chronologie", icon: Clock },
  ]

  useEffect(() => {
    // Charger le logo depuis l'API
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.logo) {
            const logoUrl = `/api/logos/${data.logo._id}`
            setLogo(logoUrl)
            console.log("🏷️ Logo chargé:", logoUrl)
          }
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement du logo:", error)
      }
    }

    loadLogo()
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          {logo ? (
            <div className="relative h-10 w-auto">
              <Image
                src={logo || "/placeholder.svg"}
                alt="Logo"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  console.log("❌ Erreur chargement logo")
                  e.currentTarget.style.display = "none"
                  e.currentTarget.nextElementSibling?.classList.remove("hidden")
                }}
              />
              <span className="hidden font-serif text-2xl font-bold text-gray-800">Galerie Luminaires</span>
            </div>
          ) : (
            <span className="font-serif text-2xl font-bold text-gray-800">Galerie Luminaires</span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  isActive
                    ? "bg-amber-100 text-amber-800 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {!isMobile && <Icon className="w-4 h-4" />}
                <span>{item.name}</span>
              </Link>
            )
          })}

          {/* Lien d'import pour les admins */}
          {isAdmin && (
            <Link
              href="/import"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                pathname === "/import"
                  ? "bg-amber-100 text-amber-800 shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {!isMobile && <Upload className="w-4 h-4" />}
              <span>Import</span>
            </Link>
          )}

          <UserMenu />
        </nav>
      </div>
    </header>
  )
}
