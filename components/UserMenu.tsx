"use client"

import { useState } from "react"
import { User, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function UserMenu() {
  const { user, userData, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (!user) {
    return (
      <>
        <Button onClick={() => setShowLoginModal(true)} variant="outline">
          Se connecter
        </Button>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    )
  }

  return (
    <div className="relative">
      <Button onClick={() => setShowMenu(!showMenu)} variant="ghost" className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span className="hidden md:inline">{user.email}</span>
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-gray-500 capitalize">{userData?.role || "free"}</p>
          </div>

          <div className="p-1">
            <button
              onClick={() => {
                setShowMenu(false)
                // Ajouter navigation vers les paramètres
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </button>

            <button
              onClick={() => {
                logout()
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
