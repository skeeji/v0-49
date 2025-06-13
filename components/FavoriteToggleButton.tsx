"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FavoriteToggleButtonProps {
  isActive: boolean
  onClick: () => void
}

export function FavoriteToggleButton({ isActive, onClick }: FavoriteToggleButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`p-2 ${isActive ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
    >
      <Heart className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
    </Button>
  )
}
