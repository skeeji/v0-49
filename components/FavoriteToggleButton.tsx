"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

interface FavoriteToggleButtonProps {
  itemId: string
  initialFavorite?: boolean
  onToggle?: (itemId: string, isFavorite: boolean) => void
  className?: string
}

export function FavoriteToggleButton({
  itemId,
  initialFavorite = false,
  onToggle,
  className,
}: FavoriteToggleButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite)

  const handleToggle = () => {
    const newFavoriteState = !isFavorite
    setIsFavorite(newFavoriteState)

    // Sauvegarder dans localStorage
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    if (newFavoriteState) {
      if (!favorites.includes(itemId)) {
        favorites.push(itemId)
      }
    } else {
      const index = favorites.indexOf(itemId)
      if (index > -1) {
        favorites.splice(index, 1)
      }
    }
    localStorage.setItem("favorites", JSON.stringify(favorites))

    onToggle?.(itemId, newFavoriteState)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={`${className} ${isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-600"}`}
    >
      <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
    </Button>
  )
}
