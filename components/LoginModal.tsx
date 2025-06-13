"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    try {
      setError(null)
      await signInWithGoogle()
      onClose()
    } catch (err) {
      setError("Erreur lors de la connexion. Veuillez réessayer.")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-playfair text-dark">Connexion</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-600 mb-4">
            Connectez-vous pour accéder à toutes les fonctionnalités de la galerie de luminaires.
          </p>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 py-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Image
                  src="/placeholder.svg?height=20&width=20&text=G"
                  alt="Google"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span>Continuer avec Google</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.</p>
        </div>
      </div>
    </div>
  )
}
