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

  // Fonction pour obtenir l'URL de l'image - CORRECTION MAJEURE
  const getImageUrl = (item: any) => {
    // CORRECTION: Utiliser "Nom du fichier" (8ème colonne CSV) pour les luminaires
    if (item["Nom du fichier"]) {
      // Si c'est déjà une URL complète, l'utiliser directement
      if (item["Nom du fichier"].startsWith("http")) {
        return item["Nom du fichier"]
      }
      // CORRECTION: Utiliser la nouvelle API pour les noms de fichiers
      return `/api/images/filename/${item["Nom du fichier"]}`
    }

    // Fallback sur filename (au cas où)
    if (item.filename) {
      if (item.filename.startsWith("http")) {
        return item.filename
      }
      return `/api/images/filename/${item.filename}`
    }

    // Fallback sur l'ancien système d'images (ObjectId)
    if (item.image) {
      if (item.image.startsWith("/api/images/")) {
        return item.image
      }
      if (typeof item.image === "string" && /^[0-9a-fA-F]{24}$/.test(item.image)) {
        return `/api/images/${item.image}`
      }
      if (item.image.startsWith("http")) {
        return item.image
      }
      // Si c'est un nom de fichier, utiliser la nouvelle API
      if (item.image.includes(".")) {
        return `/api/images/filename/${item.image}`
      }
      return `/api/images/${item.image}`
    }

    return "/placeholder.svg?height=300&width=300"
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id || item._id}
            id={`luminaire-${item.id || item._id}`}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <Link
                href={`/luminaires/${item.id || item._id}`}
                className="w-full md:w-48 h-48 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                <Image
                  src={getImageUrl(item) || "/placeholder.svg"}
                  alt={item.name || item.nom || "Luminaire"}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.log("❌ Erreur chargement image:", getImageUrl(item))
                    e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                  }}
                />
              </Link>

              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <Link href={`/luminaires/${item.id || item._id}`}>
                    <h3 className="text-xl font-playfair text-dark hover:text-orange cursor-pointer">
                      {item.name || item.nom || "Nom du luminaire"}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2">
                    <FavoriteToggleButton
                      isActive={favorites.includes(item.id || item._id)}
                      onClick={() => toggleFavorite(item.id || item._id)}
                    />
                    <Button onClick={() => setLightboxImage(getImageUrl(item))} variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Artiste</label>
                    <p className="text-gray-900">{item.artist || item.designer || "Non renseigné"}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                    <p className="text-gray-900">{item.year || item.annee || "Non renseigné"}</p>
                  </div>
                </div>

                {(item.specialty || item.specialite) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                    <p className="text-gray-600">{item.specialty || item.specialite}</p>
                  </div>
                )}

                {item.collaboration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Collaboration / Œuvre</label>
                    <p className="text-gray-600">{item.collaboration}</p>
                  </div>
                )}

                {(item.materials || item.materiaux) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matériaux</label>
                    <p className="text-gray-600">
                      {Array.isArray(item.materials)
                        ? item.materials.join(", ")
                        : Array.isArray(item.materiaux)
                          ? item.materiaux.join(", ")
                          : item.materials || item.materiaux}
                    </p>
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

  // Déterminer les classes de grille en fonction du nombre de colonnes
  const gridColumnsClass =
    {
      3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
      8: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10",
    }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

  return (
    <div className={`grid ${gridColumnsClass} gap-2 md:gap-3`}>
      {items.map((item) => (
        <div
          key={item.id || item._id}
          id={`luminaire-${item.id || item._id}`}
          className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
        >
          <Link href={`/luminaires/${item.id || item._id}`}>
            <div className="aspect-square relative bg-gray-100 cursor-pointer hover:scale-105 transition-transform">
              <Image
                src={getImageUrl(item) || "/placeholder.svg"}
                alt={item.name || item.nom || "Luminaire"}
                fill
                className="object-cover"
                onError={(e) => {
                  console.log("❌ Erreur chargement image:", getImageUrl(item))
                  e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                }}
              />

              <div className="absolute top-2 right-2">
                <FavoriteToggleButton
                  isActive={favorites.includes(item.id || item._id)}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite(item.id || item._id)
                  }}
                />
              </div>
            </div>
          </Link>

          <div className="p-2 space-y-0.5">
            <Link href={`/luminaires/${item.id || item._id}`}>
              <h3 className="font-playfair text-xs md:text-sm text-dark hover:text-orange cursor-pointer truncate">
                {item.name || item.nom || "Nom du luminaire"}
              </h3>
            </Link>

            <p className="text-gray-600 text-xs truncate">{item.artist || item.designer || "Artiste non renseigné"}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.year || item.annee || "Année inconnue"}</span>

              <Button
                onClick={() => setLightboxImage(getImageUrl(item))}
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
              >
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
