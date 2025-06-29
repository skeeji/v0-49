"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { Chrome } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      onClose()
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion requise</DialogTitle>
          <DialogDescription>
            Connectez-vous pour utiliser la recherche par image IA. Les comptes gratuits ont droit à 3 recherches par
            jour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full bg-transparent" variant="outline">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2" />
            ) : (
              <Chrome className="w-4 h-4 mr-2" />
            )}
            Continuer avec Google
          </Button>

          <div className="text-center text-sm text-gray-500">
            <p>Comptes disponibles :</p>
            <p>
              • <strong>Gratuit</strong> : 3 recherches/jour
            </p>
            <p>
              • <strong>Premium</strong> : Recherches illimitées
            </p>
            <p>
              • <strong>Admin</strong> : Accès complet
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
