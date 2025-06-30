"use client"

import { useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { X, Download, ZoomIn, ZoomOut } from "lucide-react"
import { useState } from "react"

interface LightboxProps {
  image: string
  onClose: () => void
  title?: string
}

export function Lightbox({ image, onClose, title }: LightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [onClose])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = image
    link.download = title || "image"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      {/* Contrôles */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsZoomed(!isZoomed)}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleDownload}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <Download className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Image */}
      <div
        className={`relative transition-all duration-300 cursor-pointer ${
          isZoomed ? "w-full h-full" : "max-w-4xl max-h-[80vh]"
        }`}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <Image src={image || "/placeholder.svg"} alt={title || "Image"} fill className="object-contain" priority />
      </div>

      {/* Titre */}
      {title && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-white text-lg font-medium bg-black/50 rounded-lg px-4 py-2 inline-block">{title}</p>
        </div>
      )}

      {/* Overlay pour fermer */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
