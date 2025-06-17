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
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  // Charger les favoris une seule fois au montage du composant
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFavorites = localStorage.getItem("favorites")
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites))
      }
    }
  }, [])

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id) ? favorites.filter((fav) => fav !== id) : [...favorites, id]

    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} id={`luminaire-${item.id}`} className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row gap-6">
              <Link
                href={`/luminaires/${item.id}`}
                className="w-full md:w-48 h-48 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                <Image
                  src={item.image || "/placeholder.svg?height=200&width=200"}
                  alt={item.name || "Luminaire"}
                  fill
                  className="object-cover"
                />
              </Link>

              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <Link href={`/luminaires/${item.id}`}>
                    <h3 className="text-xl font-playfair text-dark hover:text-orange cursor-pointer">
                      {item.name || "Nom du luminaire"}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2">
                    <FavoriteToggleButton
                      isActive={favorites.includes(item.id)}
                      onClick={() => toggleFavorite(item.id)}
                    />
                    <Button onClick={() => setLightboxImage(item.image)} variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Artiste</label>
                    <p className="text-gray-900">{item.artist || "Non renseigné"}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                    <p className="text-gray-900">{item.year || "Non renseigné"}</p>
                  </div>
                </div>

                {item.specialty && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                    <p className="text-gray-600">{item.specialty}</p>
                  </div>
                )}

                {item.collaboration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Collaboration / Œuvre</label>
                    <p className="text-gray-600">{item.collaboration}</p>
                  </div>
                )}

                {item.materials && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matériaux</label>
                    <p className="text-gray-600">{item.materials}</p>
                  </div>
                )}

                {item.dimensions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                    <p className="text-gray-900">{item.dimensions}</p>
                  </div>
                )}

                {item.estimation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimation</label>
                    <p className="text-gray-900">{item.estimation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </div>
    )
  }

  // Modifier la taille des luminaires en réduisant leur taille en mode grille
  // Modifier la ligne qui définit les classes de grille pour augmenter le nombre de colonnes

  // Déterminer les classes de grille en fonction du nombre de colonnes
  const gridColumnsClass =
    {
      3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
    }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

  // Réduire la taille du padding dans les cartes de luminaires
  return (
    <div className={`grid ${gridColumnsClass} gap-2 md:gap-3`}>
      {items.map((item) => (
        <div
          key={item.id}
          id={`luminaire-${item.id}`}
          className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
        >
          <Link href={`/luminaires/${item.id}`}>
            <div className="aspect-square relative bg-gray-100 cursor-pointer hover:scale-105 transition-transform">
              <Image
                src={item.image || "/placeholder.svg?height=300&width=300"}
                alt={item.name || "Luminaire"}
                fill
                className="object-cover"
              />

              <div className="absolute top-2 right-2">
                <FavoriteToggleButton
                  isActive={favorites.includes(item.id)}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite(item.id)
                  }}
                />
              </div>
            </div>
          </Link>

          <div className="p-2 space-y-0.5">
            <Link href={`/luminaires/${item.id}`}>
              <h3 className="font-playfair text-xs md:text-sm text-dark hover:text-orange cursor-pointer truncate">
                {item.name || "Nom du luminaire"}
              </h3>
            </Link>

            <p className="text-gray-600 text-xs truncate">{item.artist || "Artiste non renseigné"}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.year || "Année inconnue"}</span>

              <Button onClick={() => setLightboxImage(item.image)} variant="ghost" size="sm" className="p-1 h-auto">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
