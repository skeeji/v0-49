"use client"

import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: "admin" | "premium" | "free"
}

export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const { user, userData, loading } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h2>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour accéder à cette page.</p>
          <Button onClick={() => setShowLoginModal(true)} className="bg-orange-500 hover:bg-orange-600">
            Se connecter
          </Button>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
      </div>
    )
  }

  const hasPermission = () => {
    if (!userData) return false

    switch (requiredRole) {
      case "admin":
        return userData.role === "admin"
      case "premium":
        return userData.role === "admin" || userData.role === "premium"
      case "free":
        return userData.role === "admin" || userData.role === "premium" || userData.role === "free"
      default:
        return false
    }
  }

  if (!hasPermission()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            <br />
            Rôle requis: <span className="font-semibold">{requiredRole}</span>
            <br />
            Votre rôle: <span className="font-semibold">{userData?.role || "inconnu"}</span>
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
