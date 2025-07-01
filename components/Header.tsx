"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"

export function Header() {
  const pathname = usePathname()
  const { userData } = useAuth()
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")

  const isAdmin = userData?.role === "admin"

  const navigation = [
    { name: "Luminaires", href: "/luminaires" },
    { name: "Designers", href: "/designers" },
    { name: "Chronologie", href: "/chronologie" },
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
            className="w-32 h-32 object-contain"
            onError={(e) => {
              console.error("❌ Erreur affichage logo, fallback vers placeholder")
              setLogoUrl("/placeholder-logo.svg")
            }}
            onLoad={() => console.log("✅ Logo affiché avec succès")}
          />
        </Link>
        <nav className="flex items-center gap-8">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-2 py-2 transition-all duration-200 font-medium text-lg ${
                  isActive ? "text-slate-800" : "text-slate-700 hover:text-slate-800"
                }`}
              >
                <span>{item.name}</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: "#d4a574" }}
                  />
                )}
              </Link>
            )
          })}
          {/* Afficher le lien d'import uniquement pour les admins */}
          {isAdmin && (
            <Link
              href="/import"
              className={`relative px-2 py-2 transition-all duration-200 font-medium text-lg ${
                pathname === "/import" ? "text-slate-800" : "text-slate-700 hover:text-slate-800"
              }`}
            >
              <span>Import</span>
              {pathname === "/import" && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "#d4a574" }}
                />
              )}
            </Link>
          )}
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}
