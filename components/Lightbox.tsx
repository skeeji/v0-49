"use client"

import { useEffect } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LightboxProps {
  isOpen: boolean
  onClose: () => void
  images?: string[]
  currentIndex?: number
  onIndexChange?: (index: number) => void
  imageUrl?: string
}

export function Lightbox({ isOpen, onClose, images = [], currentIndex = 0, onIndexChange, imageUrl }: LightboxProps) {
  // Si imageUrl est fourni, utiliser un tableau avec une seule image
  const lightboxImages = imageUrl ? [imageUrl] : images
  const currentImageIndex = imageUrl ? 0 : currentIndex

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          if (lightboxImages.length > 1 && onIndexChange) {
            const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : lightboxImages.length - 1
            onIndexChange(newIndex)
          }
          break
        case "ArrowRight":
          if (lightboxImages.length > 1 && onIndexChange) {
            const newIndex = currentImageIndex < lightboxImages.length - 1 ? currentImageIndex + 1 : 0
            onIndexChange(newIndex)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentImageIndex, lightboxImages.length, onClose, onIndexChange])

  if (!isOpen || lightboxImages.length === 0) return null

  const currentImage = lightboxImages[currentImageIndex]

  const goToPrevious = () => {
    if (lightboxImages.length > 1 && onIndexChange) {
      const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : lightboxImages.length - 1
      onIndexChange(newIndex)
    }
  }

  const goToNext = () => {
    if (lightboxImages.length > 1 && onIndexChange) {
      const newIndex = currentImageIndex < lightboxImages.length - 1 ? currentImageIndex + 1 : 0
      onIndexChange(newIndex)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Bouton fermer */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Navigation précédent */}
      {lightboxImages.length > 1 && (
        <Button
          onClick={goToPrevious}
          variant="ghost"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {/* Navigation suivant */}
      {lightboxImages.length > 1 && (
        <Button
          onClick={goToNext}
          variant="ghost"
          size="sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <img
          src={currentImage || "/placeholder.svg"}
          alt="Lightbox"
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Compteur d'images */}
      {lightboxImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded">
          {currentImageIndex + 1} / {lightboxImages.length}
        </div>
      )}

      {/* Overlay cliquable pour fermer */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
