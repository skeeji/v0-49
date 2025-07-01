"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { Lightbox } from "@/components/Lightbox"
import { Eye, Calendar, User, Palette, Wrench } from "lucide-react"

interface GalleryGridProps {
  items: any[]
  viewMode?: "grid" | "list"
  onItemUpdate?: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, viewMode = "grid", onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState("")
  const [lightboxTitle, setLightboxTitle] = useState("")

  const openLightbox = (imageUrl: string, title: string) => {
    setLightboxImage(imageUrl)
    setLightboxTitle(title)
    setLightboxOpen(true)
  }

  const getGridClass = () => {
    switch (columns) {
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      case 5:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5"
      case 6:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"
      case 8:
        return "grid-cols-1 md:grid-cols-4 lg:grid-cols-8"
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    }
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-48 h-48 relative bg-gray-100">
                {item.image ? (
                  <Image
                    src={String(item.image) || "/placeholder.svg"}
                    alt={String(item.nom || "Luminaire")}
                    fill
                    className="object-cover cursor-pointer"
                    onClick={() => openLightbox(String(item.image), String(item.nom || "Luminaire"))}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400">Pas d'image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <FavoriteToggleButton
                    isFavorite={Boolean(item.isFavorite)}
                    onToggle={(isFavorite) => onItemUpdate?.(String(item._id), { isFavorite })}
                  />
                </div>
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => openLightbox(String(item.image), String(item.nom || "Luminaire"))}
                    className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <CardContent className="flex-1 p-6">
                <div className="space-y-4">
                  <div>
                    <EditableField
                      value={String(item.nom || "")}
                      onSave={(value) => onItemUpdate?.(String(item._id), { nom: value })}
                      className="text-xl font-semibold text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <EditableField
                        value={String(item.designer || "")}
                        onSave={(value) => onItemUpdate?.(String(item._id), { designer: value })}
                        placeholder="Designer"
                        className="text-sm text-gray-600"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <EditableField
                        value={String(item.annee || item.year || "")}
                        onSave={(value) => onItemUpdate?.(String(item._id), { annee: Number.parseInt(value) || null })}
                        placeholder="Année"
                        className="text-sm text-gray-600"
                      />
                    </div>

                    {item.periode && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {String(item.periode)}
                        </Badge>
                      </div>
                    )}

                    {item.materiaux && Array.isArray(item.materiaux) && item.materiaux.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-gray-500" />
                        <div className="flex flex-wrap gap-1">
                          {item.materiaux.map((materiau: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {String(materiau)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.couleurs && Array.isArray(item.couleurs) && item.couleurs.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-500" />
                        <div className="flex flex-wrap gap-1">
                          {item.couleurs.map((couleur: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {String(couleur)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <div>
                      <EditableField
                        value={String(item.description)}
                        onSave={(value) => onItemUpdate?.(String(item._id), { description: value })}
                        placeholder="Description"
                        className="text-sm text-gray-600"
                        multiline
                      />
                    </div>
                  )}

                  {item.dimensions && (
                    <div className="text-sm text-gray-500">
                      <strong>Dimensions:</strong> {String(item.dimensions)}
                    </div>
                  )}

                  {item.estimation && (
                    <div className="text-sm text-gray-500">
                      <strong>Estimation:</strong> {String(item.estimation)}
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}

        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={lightboxImage}
          title={lightboxTitle}
        />
      </div>
    )
  }

  return (
    <div className={`grid ${getGridClass()} gap-6`}>
      {items.map((item) => (
        <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow group">
          <div className="relative aspect-square bg-gray-100">
            {item.image ? (
              <Image
                src={String(item.image) || "/placeholder.svg"}
                alt={String(item.nom || "Luminaire")}
                fill
                className="object-cover cursor-pointer"
                onClick={() => openLightbox(String(item.image), String(item.nom || "Luminaire"))}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg"
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-400">Pas d'image</span>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <FavoriteToggleButton
                isFavorite={Boolean(item.isFavorite)}
                onToggle={(isFavorite) => onItemUpdate?.(String(item._id), { isFavorite })}
              />
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openLightbox(String(item.image), String(item.nom || "Luminaire"))}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="space-y-2">
              <EditableField
                value={String(item.nom || "")}
                onSave={(value) => onItemUpdate?.(String(item._id), { nom: value })}
                className="font-semibold text-gray-900 line-clamp-2"
              />
              <EditableField
                value={String(item.designer || "")}
                onSave={(value) => onItemUpdate?.(String(item._id), { designer: value })}
                placeholder="Designer"
                className="text-sm text-gray-600"
              />
              <div className="flex items-center justify-between">
                <EditableField
                  value={String(item.annee || item.year || "")}
                  onSave={(value) => onItemUpdate?.(String(item._id), { annee: Number.parseInt(value) || null })}
                  placeholder="Année"
                  className="text-sm text-gray-500"
                />
                {item.periode && (
                  <Badge variant="secondary" className="text-xs">
                    {String(item.periode)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
      />
    </div>
  )
}
