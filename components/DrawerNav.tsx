"use client"

import { useEffect } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

interface DrawerNavProps {
  isOpen: boolean
  onClose: () => void
  navItems: Array<{ href: string; label: string }>
}

export function DrawerNav({ isOpen, onClose, navItems }: DrawerNavProps) {
  const { user, signInWithGoogle, logout } = useAuth()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={onClose}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t">
            {user ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{user.displayName || "Utilisateur"}</div>
                  <div className="text-xs">{user.email}</div>
                </div>
                <Button onClick={logout} variant="outline" className="w-full bg-transparent">
                  Se déconnecter
                </Button>
              </div>
            ) : (
              <Button
                onClick={signInWithGoogle}
                className="w-full text-white font-medium"
                style={{ backgroundColor: "#f2d895" }}
              >
                Connexion
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
