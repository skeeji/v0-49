"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawerNav } from "@/components/DrawerNav"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logo, setLogo] = useState("")
  const { user, userData, signInWithGoogle, logout } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.logo) {
            setLogo(`/api/images/${data.logo._id}`)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
      }
    }

    loadLogo()
  }, [])

  const navItems = [
    { href: "/luminaires", label: "Luminaires" },
    { href: "/designers", label: "Designers" },
    { href: "/chronologie", label: "Chronologie" },
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
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="w-16 h-16 relative">
                {logo ? (
                  <Image
                    src={logo || "/placeholder.svg"}
                    alt="Logo"
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-logo.svg"
                    }}
                  />
                ) : (
                  <Image src="/placeholder-logo.svg" alt="Logo" fill className="object-contain" />
                )}
              </div>
            </Link>

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL || "/placeholder.svg"}
                            alt={user.displayName || "User"}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <span className="hidden sm:block text-sm font-medium">
                        {user.displayName || user.email?.split("@")[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      <div className="font-medium text-gray-900">{user.displayName || "Utilisateur"}</div>
                      <div className="text-xs">{user.email}</div>
                      <div className="text-xs mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {userData?.role || "free"}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Se déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
