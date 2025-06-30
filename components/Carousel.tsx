"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CarouselProps {
  images: string[]
  alt: string
  className?: string
}

export function Carousel({ images, alt, className = "" }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1))
  }

  // Auto-play (optional)
  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  if (images.length === 0) {
    return (
      <div className={`relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Aucune image</span>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className={`relative aspect-square ${className}`}>
        <Image src={images[0] || "/placeholder.svg"} alt={alt} fill className="object-cover rounded-lg" />
      </div>
    )
  }

  return (
    <div className={`relative aspect-square ${className}`}>
      {/* Image principale */}
      <div className="relative w-full h-full">
        <Image
          src={images[currentIndex] || "/placeholder.svg"}
          alt={`${alt} ${currentIndex + 1}`}
          fill
          className="object-cover rounded-lg"
        />
      </div>

      {/* Boutons de navigation */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
        onClick={goToPrevious}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
        onClick={goToNext}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Indicateurs */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-white" : "bg-white/50"}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      {/* Compteur */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}
