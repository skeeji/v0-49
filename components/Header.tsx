"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { UserMenu } from "./UserMenu"
import { DrawerNav } from "./DrawerNav"

export function Header() {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch("/api/logo")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.logoUrl) {
            setLogoUrl(data.logoUrl)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error)
      }
    }

    fetchLogo()
  }, [])

  return (
    <header className="bg-white shadow-sm border-b h-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-32">
          <div className="flex items-center">
            <DrawerNav />
            <Link href="/" className="flex items-center ml-4">
              {logoUrl ? (
                <img
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  className="w-28 h-28 object-contain"
                  width={120}
                  height={120}
                />
              ) : (
                <img
                  src="/placeholder-logo.png"
                  alt="Logo"
                  className="w-28 h-28 object-contain"
                  width={120}
                  height={120}
                />
              )}
            </Link>
          </div>
          <div className="flex items-center space-x-4">{user && <UserMenu />}</div>
        </div>
      </div>
    </header>
  )
}
