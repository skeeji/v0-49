"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, Lightbulb, Users, Clock, Upload } from "lucide-react"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState, useEffect } from "react"

export function Header() {
  const pathname = usePathname()
  const { userData } = useAuth()
  const isMobile = useIsMobile()
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")

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
        console.log("🖼️ Chargement du logo...")
        const response = await fetch("/api/logo")
        console.log("📄 Réponse API logo:", response.status)
        if (response.ok) {
          setLogoUrl("/api/logo")
          console.log("✅ Logo chargé avec succès")
        } else {
          console.log("⚠️ Logo personnalisé non disponible, utilisation du logo par défaut")
        }
      } catch (error) {
        console.error("💥 Erreur chargement logo:", error)
        console.log("Logo personnalisé non disponible, utilisation du logo par défaut")
      }
    }

    loadLogo()
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-sm border-b">
      <div className="container flex items-center justify-between h-32">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logoUrl || "/placeholder.svg"}
            alt="Logo"
            width={120}
            height={120}
            className="w-28 h-28 object-contain"
            onError={(e) => {
              console.error("❌ Erreur affichage logo, fallback vers placeholder")
              setLogoUrl("/placeholder-logo.svg")
            }}
            onLoad={() => console.log("✅ Logo affiché avec succès")}
          />
        </Link>
        <nav className="flex items-center gap-4">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-cream ${
                  isActive ? "bg-orange text-white" : "text-dark"
                }`}
              >
                {!isMobile && <Icon className="w-4 h-4" />}
                <span>{item.name}</span>
              </Link>
            )
          })}
          {/* Afficher le lien d'import uniquement pour les admins */}
          {isAdmin && (
            <Link
              href="/import"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-cream ${
                pathname === "/import" ? "bg-orange text-white" : "text-dark"
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
