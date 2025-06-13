"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface LightboxProps {
  src: string
  onClose: () => void
}

export function Lightbox({ src, onClose }: LightboxProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative max-w-4xl max-h-full">
        <Button onClick={onClose} variant="ghost" className="absolute -top-12 right-0 text-white hover:text-gray-300">
          <X className="w-6 h-6" />
        </Button>

        <div className="relative w-full h-full max-h-[80vh] max-w-[80vw]">
          <Image
            src={src || "/placeholder.svg?height=600&width=600"}
            alt="Luminaire en grand"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  )
}
