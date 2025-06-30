"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { DrawerNav } from "@/components/DrawerNav"
import { UserMenu } from "@/components/UserMenu"
import { Button } from "@/components/ui/button"
import { Home, Lightbulb, Users, Clock, Upload } from "lucide-react"

const navigation = [
  { name: "Accueil", href: "/", icon: Home },
  { name: "Luminaires", href: "/luminaires", icon: Lightbulb },
  { name: "Designers", href: "/designers", icon: Users },
  { name: "Chronologie", href: "/chronologie", icon: Clock },
  { name: "Import", href: "/import", icon: Upload },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo et navigation mobile */}
          <div className="flex items-center gap-4">
            <DrawerNav />

            <Link href="/" className="flex items-center gap-2">
              <Image src="/placeholder-logo.svg" alt="Logo" width={32} height={32} className="w-8 h-8" />
              <span className="font-serif text-xl font-bold text-gray-900 hidden sm:block">Luminaires</span>
            </Link>
          </div>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.name} href={item.href}>
                  <Button variant={isActive ? "default" : "ghost"} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Menu utilisateur */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
