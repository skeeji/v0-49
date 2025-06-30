"use client"

import { useState } from "react"
import { User, LogOut, Crown, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import type { UserRole } from "@/lib/firebase"

// Mode développement désactivé
const DEV_MODE = false

export function UserMenu() {
  const { user, userData, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return (
          <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
            <Crown className="w-3 h-3" />
            <span>Admin</span>
          </div>
        )
      case "premium":
        return (
          <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
            <Crown className="w-3 h-3" />
            <span>Premium</span>
          </div>
        )
      case "free":
        return (
          <div className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
            <UserIcon className="w-3 h-3" />
            <span>Free</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {user ? (
        <div className="relative">
          <Button onClick={() => setIsMenuOpen(!isMenuOpen)} variant="ghost" className="flex items-center gap-2 px-3">
            <div className="w-8 h-8 rounded-full bg-orange flex items-center justify-center text-white">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium truncate max-w-[120px]">
                {user.displayName || user.email?.split("@")[0]}
              </div>
              {userData && getRoleBadge(userData.role)}
            </div>
          </Button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium">{user.displayName || user.email?.split("@")[0]}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {userData && <div className="mt-1">{getRoleBadge(userData.role)}</div>}
              </div>
              <div className="py-1">
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setIsMenuOpen(false)
                    logout()
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button onClick={() => setIsLoginModalOpen(true)} className="bg-orange hover:bg-orange/90">
          <User className="w-4 h-4 mr-2" />
          Connexion
        </Button>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
