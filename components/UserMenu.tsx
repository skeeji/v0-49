"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function UserMenu() {
  const { user, userData, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

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
          style={{ backgroundColor: "#f2d895" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
        >
          Connexion
        </Button>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="hidden md:inline">{userData?.email || user.email}</span>
          {userData?.role && (
            <span
              className="px-2 py-1 text-xs font-medium rounded-full text-white"
              style={{ backgroundColor: "#f2d895" }}
            >
              {userData.role}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
