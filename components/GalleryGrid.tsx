"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Edit3, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { Lightbox } from "@/components/Lightbox"
import { useAuth } from "@/contexts/AuthContext"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate?: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [editingItem, setEditingItem] = useState<string | null>(null)

  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const getImageUrl = (item: any) => {
    if (item.images && item.images.length > 0) {
      return `/api/images/${item.images[0]}`
    }
    return "/placeholder.svg?height=300&width=300"
  }

  const getAllImages = (item: any) => {
    if (item.images && item.images.length > 0) {
      return item.images.map((id: string) => `/api/images/${id}`)
    }
    return ["/placeholder.svg?height=300&width=300"]
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item._id}
            className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="relative w-20 h-20 flex-shrink-0">
              <Image
                src={getImageUrl(item) || "/placeholder.svg"}
                alt={item.nom || "Luminaire"}
                fill
                className="object-cover rounded-md"
                sizes="80px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{item.nom || "Sans nom"}</h3>
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 truncate">{item.designer || "Designer inconnu"}</p>
                </div>
                <div className="flex-shrink-0 w-20">
                  <p className="text-gray-500 text-sm">{item.annee || item.year || "—"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FavoriteToggleButton itemId={item._id} />
                  <Link href={`/luminaires/${item._id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    8: "grid-cols-8",
  }

  return (
    <>
      <div className={`grid ${gridCols[columns as keyof typeof gridCols] || "grid-cols-4"} gap-6`}>
        {items.map((item) => (
          <div
            key={item._id}
            className="group relative bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-t-lg">
              <Image
                src={getImageUrl(item) || "/placeholder.svg"}
                alt={item.nom || "Luminaire"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes={`(min-width: 1024px) ${100 / columns}vw, (min-width: 768px) 33vw, 50vw`}
              />

              {/* Overlay avec actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openLightbox(getAllImages(item), 0)}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <FavoriteToggleButton itemId={item._id} />
                </div>
              </div>

              {/* Badge nombre d'images */}
              {item.images && item.images.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {item.images.length} photos
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="p-4">
              <div className="space-y-2">
                {/* Nom */}
                <div>
                  {isAdmin && editingItem === item._id ? (
                    <EditableField
                      value={item.nom || ""}
                      onSave={(value) => {
                        onItemUpdate?.(item._id, { nom: value })
                        setEditingItem(null)
                      }}
                      onCancel={() => setEditingItem(null)}
                      className="font-medium text-gray-900"
                    />
                  ) : (
                    <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">{item.nom || "Sans nom"}</h3>
                  )}
                </div>

                {/* Designer */}
                <p className="text-sm text-gray-600 line-clamp-1">{item.designer || "Designer inconnu"}</p>

                {/* Année */}
                <p className="text-sm text-gray-500">{item.annee || item.year || "Année inconnue"}</p>
              </div>

              {/* Actions admin */}
              {isAdmin && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(editingItem === item._id ? null : item._id)}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Éditer
                  </Button>
                  <Link href={`/luminaires/${item._id}`}>
                    <Button variant="outline" size="sm">
                      Voir détails
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </>
  )
}
