"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface FavoriteToggleButtonProps {
  itemId: string
  initialFavorite?: boolean
  className?: string
}

export function FavoriteToggleButton({ itemId, initialFavorite = false, className = "" }: FavoriteToggleButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter aux favoris")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/luminaires/${itemId}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      })

      const data = await response.json()

      if (data.success) {
        setIsFavorite(!isFavorite)
        toast.success(!isFavorite ? "Ajouté aux favoris" : "Retiré des favoris")
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error("Erreur toggle favori:", error)
      toast.error("Erreur lors de la mise à jour des favoris")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`${isFavorite ? "text-red-500" : "text-gray-400"} hover:text-red-500 ${className}`}
    >
      <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
    </Button>
  )
}
