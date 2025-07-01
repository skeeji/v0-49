"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { Lightbox } from "@/components/Lightbox"
import { useAuth } from "@/contexts/AuthContext"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState("")
  const { userData } = useAuth()

  const isAdmin = userData?.role === "admin"

  const handleImageClick = (imageUrl: string) => {
    setLightboxImage(imageUrl)
    setLightboxOpen(true)
  }

  const handleFavoriteToggle = (id: string, currentFavorite: boolean) => {
    onItemUpdate(id, { isFavorite: !currentFavorite })
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              {/* Image */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={item.image || "/placeholder.svg?height=80&width=80"}
                  alt={item.nom || "Luminaire"}
                  fill
                  className="object-cover rounded-lg cursor-pointer"
                  onClick={() => handleImageClick(item.image || "/placeholder.svg")}
                />
              </div>

              {/* Informations principales */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nom */}
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">
                      {isAdmin ? (
                        <EditableField
                          value={item.nom || ""}
                          onSave={(value) => onItemUpdate(item._id, { nom: value })}
                          className="font-medium"
                        />
                      ) : (
                        item.nom || "Sans nom"
                      )}
                    </h3>
                  </div>

                  {/* Designer */}
                  <div>
                    <p className="text-gray-600 truncate">
                      {isAdmin ? (
                        <EditableField
                          value={item.designer || ""}
                          onSave={(value) => onItemUpdate(item._id, { designer: value })}
                          className="text-gray-600"
                        />
                      ) : (
                        item.designer || "Designer inconnu"
                      )}
                    </p>
                  </div>

                  {/* Année */}
                  <div>
                    <p className="text-gray-500">
                      {isAdmin ? (
                        <EditableField
                          value={item.annee?.toString() || item.year?.toString() || ""}
                          onSave={(value) => onItemUpdate(item._id, { annee: Number.parseInt(value) || null })}
                          className="text-gray-500"
                        />
                      ) : (
                        item.annee || item.year || "Année inconnue"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFavoriteToggle(item._id, item.isFavorite)}
                  className={item.isFavorite ? "text-red-500" : "text-gray-400"}
                >
                  <Heart className={`w-4 h-4 ${item.isFavorite ? "fill-current" : ""}`} />
                </Button>

                <Link href={`/luminaires/${item._id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        <Lightbox isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} imageUrl={lightboxImage} />
      </div>
    )
  }

  // Mode grille
  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    8: "grid-cols-8",
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-4`}>
      {items.map((item) => (
        <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          {/* Image */}
          <div className="relative aspect-square">
            <Image
              src={item.image || "/placeholder.svg?height=200&width=200"}
              alt={item.nom || "Luminaire"}
              fill
              className="object-cover cursor-pointer"
              onClick={() => handleImageClick(item.image || "/placeholder.svg")}
            />

            {/* Bouton favori */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFavoriteToggle(item._id, item.isFavorite)}
              className={`absolute top-2 right-2 ${item.isFavorite ? "text-red-500" : "text-white"} bg-black/20 hover:bg-black/40`}
            >
              <Heart className={`w-4 h-4 ${item.isFavorite ? "fill-current" : ""}`} />
            </Button>
          </div>

          {/* Informations */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 truncate mb-1">
              {isAdmin ? (
                <EditableField
                  value={item.nom || ""}
                  onSave={(value) => onItemUpdate(item._id, { nom: value })}
                  className="font-medium"
                />
              ) : (
                item.nom || "Sans nom"
              )}
            </h3>

            <p className="text-sm text-gray-600 truncate mb-1">
              {isAdmin ? (
                <EditableField
                  value={item.designer || ""}
                  onSave={(value) => onItemUpdate(item._id, { designer: value })}
                  className="text-sm text-gray-600"
                />
              ) : (
                item.designer || "Designer inconnu"
              )}
            </p>

            <p className="text-sm text-gray-500 mb-3">
              {isAdmin ? (
                <EditableField
                  value={item.annee?.toString() || item.year?.toString() || ""}
                  onSave={(value) => onItemUpdate(item._id, { annee: Number.parseInt(value) || null })}
                  className="text-sm text-gray-500"
                />
              ) : (
                item.annee || item.year || "Année inconnue"
              )}
            </p>

            {/* Bouton voir détails */}
            <Link href={`/luminaires/${item._id}`}>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                Voir détails
              </Button>
            </Link>
          </div>
        </div>
      ))}

      <Lightbox isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} imageUrl={lightboxImage} />
    </div>
  )
}
