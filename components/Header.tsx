"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Home, Lightbulb, Users, Clock, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/contexts/AuthContext"

const navigation = [
  { name: "Accueil", href: "/", icon: Home, requiredRole: null },
  { name: "Luminaires", href: "/luminaires", icon: Lightbulb, requiredRole: null },
  { name: "Designers", href: "/designers", icon: Users, requiredRole: null },
  { name: "Chronologie", href: "/chronologie", icon: Clock, requiredRole: null },
  { name: "Import", href: "/import", icon: Upload, requiredRole: "admin" },
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { userData } = useAuth()

  // Filtrer les éléments de navigation en fonction du rôle de l'utilisateur
  const filteredNavigation = navigation.filter((item) => {
    if (!item.requiredRole) return true
    if (!userData) return false

    if (item.requiredRole === "admin") {
      return userData.role === "admin"
    }

    if (item.requiredRole === "premium") {
      return userData.role === "admin" || userData.role === "premium"
    }

    return true
  })

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-lg">
      <div className="container-responsive">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/gersaint-logo.png"
              alt="Gersaint Paris"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? "bg-orange text-white" : "text-dark hover:bg-orange/10 hover:text-orange"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <UserMenu />

            {/* Menu mobile */}
            <Button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden bg-transparent text-dark hover:bg-orange/10"
              size="sm"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-t shadow-lg">
            <nav className="container-responsive py-4">
              <div className="space-y-2">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive ? "bg-orange text-white" : "text-dark hover:bg-orange/10 hover:text-orange"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
