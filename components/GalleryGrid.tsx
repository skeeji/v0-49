"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { Lightbox } from "@/components/Lightbox"
import Link from "next/link"

interface GalleryGridProps {
  items: any[]
  onItemUpdate: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, onItemUpdate, columns = 5 }: GalleryGridProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const storedFavorites = localStorage.getItem("favorites")
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites))
    }
  }, [])

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id) ? favorites.filter((fav) => fav !== id) : [...favorites, id]
    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }
  
  const gridColumnsClass = {
      3: "grid-cols-2 sm:grid-cols-3",
      4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
      5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
    }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"


  return (
    <div className={`grid ${gridColumnsClass} gap-4`}>
      {items.map((item) => {
        // CORRECTION : L'URL de l'image est construite en utilisant l'ID de l'image
        // stocké dans item.images[0]
        const imageUrl = item.images && item.images[0] 
          ? `/api/images/${item.images[0]}`
          : "/placeholder.svg";

        return (
          <div key={item._id || item.id} id={`luminaire-${item._id || item.id}`} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <Link href={`/luminaires/${item._id || item.id}`}>
              <div className="aspect-square relative bg-gray-100 cursor-pointer group">
                <Image
                  src={imageUrl}
                  alt={item.nom || "Luminaire"}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <FavoriteToggleButton
                    isActive={favorites.includes(item._id || item.id)}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      toggleFavorite(item._id || item.id);
                    }}
                  />
                </div>
              </div>
            </Link>

            <div className="p-3">
              <Link href={`/luminaires/${item._id || item.id}`}>
                <h3 className="font-playfair text-base text-dark hover:text-orange cursor-pointer truncate">
                  {item.nom || "Nom du luminaire"}
                </h3>
              </Link>
              <p className="text-sm text-gray-600 truncate">{item.designer || "Artiste non renseigné"}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">{item.annee || "Année inconnue"}</span>
                <Button onClick={() => setLightboxImage(imageUrl)} variant="ghost" size="sm" className="p-1 h-auto">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
