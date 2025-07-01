"use client"

import { useState } from "react"
import { User, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoginModal } from "@/components/LoginModal"
import { useAuth } from "@/contexts/AuthContext"

export function UserMenu() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { user, userData, logout } = useAuth()

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
          onClick={() => setIsLoginModalOpen(true)}
          className="text-white transition-all duration-200"
          style={{ backgroundColor: "#f2d895" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
        >
          <User className="w-4 h-4 mr-2" />
          Connexion
        </Button>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{userData?.displayName || user.email}</span>
          {userData?.role === "admin" && (
            <span
              className="px-2 py-1 text-xs font-medium text-white rounded-full ml-2"
              style={{ backgroundColor: "#f2d895" }}
            >
              Admin
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">{userData?.displayName || user.email}</div>
        <div className="px-2 py-1.5 text-xs text-gray-500">{user.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
