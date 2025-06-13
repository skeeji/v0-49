"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Home, Upload, Lightbulb, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Accueil", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Luminaires", href: "/luminaires", icon: Lightbulb },
  { name: "Designers", href: "/designers", icon: Users },
  { name: "Chronologie", href: "/chronologie", icon: Clock },
]

export function DrawerNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Bouton menu mobile */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white/90 backdrop-blur-sm text-dark hover:bg-white"
        size="sm"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Navigation desktop */}
      <nav className="hidden lg:block fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-40">
        <div className="p-6">
          <h2 className="text-2xl font-playfair text-dark mb-8">Galerie Luminaires</h2>

          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? "bg-orange text-white" : "text-dark hover:bg-cream"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Drawer mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-playfair text-dark">Galerie Luminaires</h2>
                <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <ul className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive ? "bg-orange text-white" : "text-dark hover:bg-cream"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal avec marge sur desktop */}
      <div className="lg:ml-64">{/* Le contenu des pages sera rendu ici */}</div>
    </>
  )
}
