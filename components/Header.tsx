"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { UserMenu } from "@/components/UserMenu"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.svg")

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        const data = await response.json()
        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl)
        }
      } catch (error) {
        console.error("Erreur chargement logo:", error)
      }
    }

    loadLogo()
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src={logoUrl || "/placeholder.svg"}
              alt="Logo"
              width={128}
              height={128}
              className="w-32 h-32 object-contain"
              onError={() => setLogoUrl("/placeholder-logo.svg")}
            />
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/luminaires"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Luminaires
            </Link>
            <Link href="/designers" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Designers
            </Link>
            <Link
              href="/chronologie"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Chronologie
            </Link>
            <Link href="/import" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Import
            </Link>
          </nav>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <UserMenu />
          </div>

          {/* Menu mobile */}
          <div className="md:hidden flex items-center space-x-2">
            <UserMenu />
            <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      <DrawerNav isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
