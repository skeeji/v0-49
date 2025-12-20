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
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export function UserMenu() {
  const { user, userData, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setShowLoginModal(true)}
          style={{ backgroundColor: "#f2d895", color: "#000" }}
          className="hover:opacity-90"
          size="sm"
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
          <span className="hidden sm:inline">{userData?.displayName || user.email}</span>
          {userData?.role === "admin" && (
            <span className="px-2 py-1 text-xs rounded-full text-black" style={{ backgroundColor: "#f2d895" }}>
              Admin
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm text-gray-500">
          Connecté en tant que
          <div className="font-medium text-gray-900">{userData?.displayName || user.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
