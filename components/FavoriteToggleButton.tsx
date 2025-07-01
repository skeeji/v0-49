"use client"

import type React from "react"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FavoriteToggleButtonProps {
  isActive: boolean
  onClick: (e?: React.MouseEvent) => void
}

export function FavoriteToggleButton({ isActive, onClick }: FavoriteToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`p-2 ${isActive ? "text-red-500" : "text-gray-400"} hover:text-red-500`}
    >
      <Heart className={`w-4 h-4 ${isActive ? "fill-current" : ""}`} />
    </Button>
  )
}
