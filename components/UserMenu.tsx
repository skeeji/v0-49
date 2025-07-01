"use client"

import { useState } from "react"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function UserMenu() {
  const { user, userData, signInWithGoogle, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      setShowLoginModal(false)
    } catch (error) {
      console.error("Erreur lors de la connexion:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setShowLoginModal(true)}
          className="text-white transition-all duration-200"
          style={{ backgroundColor: "#d4a574" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
        >
          <User className="w-4 h-4 mr-2" />
          Connexion
        </Button>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-slate-700 hover:text-slate-800">
          <User className="w-5 h-5" />
          <span className="hidden md:inline">{userData?.email || user.email}</span>
          {userData?.role && (
            <span
              className="px-2 py-1 text-xs font-medium rounded-full text-white"
              style={{ backgroundColor: "#d4a574" }}
            >
              {userData.role}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userData?.email || user.email}</p>
          {userData?.role && <p className="text-xs text-slate-500 capitalize">Rôle: {userData.role}</p>}
          {userData?.role === "free" && (
            <p className="text-xs text-slate-500">Recherches: {userData.searchCount || 0}/3</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
