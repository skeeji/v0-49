"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

interface DrawerNavProps {
  isOpen: boolean
  onClose: () => void
  navItems: Array<{ href: string; label: string }>
}

export function DrawerNav({ isOpen, onClose, navItems }: DrawerNavProps) {
  const { user, userData, signInWithGoogle, logout } = useAuth()
  const pathname = usePathname()

  const isActivePage = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActivePage(item.href)
                      ? "bg-gold text-white border-l-4 border-gold-dark"
                      : "text-gray-700 hover:bg-beige"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || "Utilisateur"}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {userData?.role || "free"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Se déconnecter
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  signInWithGoogle()
                  onClose()
                }}
                className="w-full text-white font-medium bg-gold hover:bg-gold-dark"
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
