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
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      onClose()
    } catch (error) {
      console.error("Erreur lors de la connexion:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-slate-800">Connexion requise</DialogTitle>
          <DialogDescription className="text-slate-600">
            Connectez-vous pour utiliser la recherche par image IA et accéder à toutes les fonctionnalités.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl shadow-lg transition-all duration-200"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white mr-3"></div>
            ) : (
              <Chrome className="w-5 h-5 mr-3" />
            )}
            Continuer avec Google
          </Button>

          <div className="text-center">
            <p className="text-sm text-slate-500">En vous connectant, vous acceptez nos conditions d'utilisation</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <h4 className="font-medium text-slate-800 mb-2">Avantages de la connexion :</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 3 recherches IA gratuites par jour</li>
              <li>• Sauvegarde de vos favoris</li>
              <li>• Accès aux fonctionnalités premium</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
