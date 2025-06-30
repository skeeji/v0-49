"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { Lightbox } from "@/components/Lightbox"
import { Eye, ExternalLink } from "lucide-react"

interface GalleryItem {
  id: string
  name: string
  artist: string
  year: string
  image: string | null
  period?: string
  type?: string
  specialty?: string
  collaboration?: string
}

interface GalleryGridProps {
  items: GalleryItem[]
  viewMode: "grid" | "list"
  onItemUpdate?: (id: string, updates: any) => void
  showEditableFields?: boolean
}

export function GalleryGrid({ items, viewMode, onItemUpdate, showEditableFields = true }: GalleryGridProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const updateField = (id: string, field: string, value: string) => {
    onItemUpdate?.(id, { [field]: value })
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                {/* Image */}
                <div className="w-32 h-32 relative flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover cursor-pointer"
                      onClick={() => setLightboxImage(item.image)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Pas d'image</span>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {showEditableFields ? (
                        <EditableField
                          value={item.name}
                          onSave={(value) => updateField(item.id, "name", value)}
                          placeholder="Nom du luminaire"
                          className="mb-2"
                        />
                      ) : (
                        <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                      )}

                      {showEditableFields ? (
                        <EditableField
                          value={item.artist}
                          onSave={(value) => updateField(item.id, "artist", value)}
                          placeholder="Artiste / Designer"
                          className="mb-2"
                        />
                      ) : (
                        <p className="text-gray-600 mb-2">{item.artist}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {item.year && <Badge variant="secondary">{item.year}</Badge>}
                        {item.period && <Badge variant="outline">{item.period}</Badge>}
                        {item.type && <Badge variant="outline">{item.type}</Badge>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <FavoriteToggleButton itemId={item.id} />
                      <Link href={`/luminaires/${item.id}`}>
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </Link>
                    </div>
                  </div>

                  {showEditableFields && (
                    <div className="space-y-2">
                      <EditableField
                        value={item.specialty || ""}
                        onSave={(value) => updateField(item.id, "specialty", value)}
                        placeholder="Spécialité"
                        multiline
                      />
                      <EditableField
                        value={item.collaboration || ""}
                        onSave={(value) => updateField(item.id, "collaboration", value)}
                        placeholder="Collaboration / Œuvre"
                        multiline
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {lightboxImage && <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {/* Image */}
              <div className="aspect-square relative bg-gray-100">
                {item.image ? (
                  <>
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => setLightboxImage(item.image)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400">Pas d'image</span>
                  </div>
                )}

                {/* Bouton favori */}
                <div className="absolute top-2 right-2">
                  <FavoriteToggleButton itemId={item.id} />
                </div>
              </div>

              {/* Contenu */}
              <div className="p-4">
                {showEditableFields ? (
                  <>
                    <EditableField
                      value={item.name}
                      onSave={(value) => updateField(item.id, "name", value)}
                      placeholder="Nom du luminaire"
                      className="mb-2"
                    />
                    <EditableField
                      value={item.artist}
                      onSave={(value) => updateField(item.id, "artist", value)}
                      placeholder="Artiste / Designer"
                      className="mb-2"
                    />
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-1">{item.artist}</p>
                  </>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.year && (
                    <Badge variant="secondary" className="text-xs">
                      {item.year}
                    </Badge>
                  )}
                  {item.period && (
                    <Badge variant="outline" className="text-xs">
                      {item.period}
                    </Badge>
                  )}
                </div>

                {showEditableFields && (
                  <div className="space-y-2">
                    <EditableField
                      value={item.specialty || ""}
                      onSave={(value) => updateField(item.id, "specialty", value)}
                      placeholder="Spécialité"
                      multiline
                    />
                    <EditableField
                      value={item.collaboration || ""}
                      onSave={(value) => updateField(item.id, "collaboration", value)}
                      placeholder="Collaboration / Œuvre"
                      multiline
                    />
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <Link
                    href={`/luminaires/${item.id}`}
                    className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                  >
                    Voir détails →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lightboxImage && <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </>
  )
}
