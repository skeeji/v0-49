"use client"

import { Button } from "@/components/ui/button"

import type { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import type { UserRole } from "@/lib/firebase"
import { LoginModal } from "@/components/LoginModal"
import { useState, useEffect } from "react"

interface RoleGuardProps {
  children: ReactNode
  requiredRole?: UserRole | null
  fallback?: ReactNode
}

export function RoleGuard({ children, requiredRole = null, fallback }: RoleGuardProps) {
  const { user, userData, isLoading } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté et qu'un rôle est requis, afficher la modal de connexion
    if (!isLoading && !user && requiredRole) {
      setShowLoginModal(true)
    }
  }, [user, requiredRole, isLoading])

  // Pendant le chargement, afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange border-t-transparent"></div>
      </div>
    )
  }

  // Si aucun rôle n'est requis, afficher le contenu
  if (!requiredRole) {
    return <>{children}</>
  }

  // Si l'utilisateur n'est pas connecté, afficher le fallback ou la modal de connexion
  if (!user) {
    return (
      <>
        {fallback || (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-playfair text-dark mb-4">Accès restreint</h2>
            <p className="text-gray-600 mb-6">Vous devez être connecté pour accéder à cette page.</p>
            <Button onClick={() => setShowLoginModal(true)} className="bg-orange hover:bg-orange/90">
              Se connecter
            </Button>
          </div>
        )}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    )
  }

  // Vérifier si l'utilisateur a le rôle requis
  if (userData) {
    const hasRequiredRole =
      requiredRole === "free" ||
      (requiredRole === "premium" && (userData.role === "premium" || userData.role === "admin")) ||
      (requiredRole === "admin" && userData.role === "admin")

    if (hasRequiredRole) {
      return <>{children}</>
    }
  }

  // Si l'utilisateur n'a pas le rôle requis, afficher le fallback
  return (
    <>
      {fallback || (
        <div className="bg-white rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-playfair text-dark mb-4">Accès restreint</h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            {userData?.role === "free" && requiredRole === "premium" && (
              <span className="block mt-2 text-orange">
                Passez à un compte Premium pour débloquer cette fonctionnalité.
              </span>
            )}
          </p>
        </div>
      )}
    </>
  )
}
