"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CarouselProps {
  items: any[]
}

export function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerView = 3

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + itemsPerView >= items.length ? 0 : prev + itemsPerView))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, items.length - itemsPerView) : Math.max(0, prev - itemsPerView),
    )
  }

  if (items.length === 0) {
    return <div className="text-center text-gray-500 py-8">Aucun luminaire pour cette période</div>
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">Luminaires de la période</h4>

        <div className="flex gap-2">
          <Button onClick={prevSlide} variant="outline" size="sm" disabled={currentIndex === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={nextSlide}
            variant="outline"
            size="sm"
            disabled={currentIndex + itemsPerView >= items.length}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.slice(currentIndex, currentIndex + itemsPerView).map((item, index) => (
          <div key={index} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={item.image || "/placeholder.svg?height=150&width=150"}
              alt={item.name || "Luminaire"}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
              <p className="text-xs font-medium truncate">{item.name || "Sans nom"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
