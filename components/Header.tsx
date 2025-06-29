"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Lightbulb, Users, Clock, Upload } from "lucide-react"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"

export function Header() {
  const pathname = usePathname()
  const { userData } = useAuth()
  const isMobile = useIsMobile()

  const isAdmin = userData?.role === "admin"

  const navigation = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Luminaires", href: "/luminaires", icon: Lightbulb },
    { name: "Designers", href: "/designers", icon: Users },
    { name: "Chronologie", href: "/chronologie", icon: Clock },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-sm border-b">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="font-playfair text-2xl font-bold text-dark">
          Galerie Luminaires
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
