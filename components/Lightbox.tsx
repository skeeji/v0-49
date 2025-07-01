"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { useEffect } from "react"

interface LightboxProps {
  src: string
  onClose: () => void
}

export function Lightbox({ src, onClose }: LightboxProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-4xl max-h-full">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-100">
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full h-full">
          <Image
            src={src || "/placeholder.svg"}
            alt="Image agrandie"
            width={800}
            height={600}
            className="object-contain max-w-full max-h-[80vh]"
          />
        </div>
      </div>
    </div>
  )
}
