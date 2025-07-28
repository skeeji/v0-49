"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { Lightbox } from "@/components/Lightbox"
import { useAuth } from "@/contexts/AuthContext"
import { Eye } from "lucide-react"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate?: (id: string, updates: any) => void
  columns?: number
  freeUserLimit?: number
  isUserFree?: boolean
}

export function GalleryGrid({
  items,
  viewMode,
  onItemUpdate,
  columns = 4,
  freeUserLimit = items.length,
  isUserFree = false,
}: GalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState("")
  const [lightboxTitle, setLightboxTitle] = useState("")
  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  const openLightbox = (imageUrl: string, title: string) => {
    setLightboxImage(imageUrl)
    setLightboxTitle(title)
    setLightboxOpen(true)
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item, index) => {
          const isAccessible = isUserFree ? index < freeUserLimit : true
          const imageUrl = item.filename ? `/api/images/filename/${item.filename}` : "/placeholder.svg"
          const title = item["Nom luminaire"] || item.nom || "Sans nom"

          const CardWrapper = isAccessible ? Link : "div"

          return (
            <CardWrapper key={item._id} {...(isAccessible ? { href: `/luminaires/${item._id}` } : {})}>
              <Card
                className={`transition-all ${
                  isAccessible ? "hover:shadow-lg cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 relative flex-shrink-0">
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={title}
                        fill
                        className="object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=128&width=128"
                        }}
                      />
                      {isAccessible && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openLightbox(imageUrl, title)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          {isAdmin && isAccessible ? (
                            <EditableField
                              value={title}
                              onSave={(newValue) => onItemUpdate?.(item._id, { nom: newValue })}
                              className="text-xl font-semibold text-gray-900 mb-1"
                            />
                          ) : (
                            <h3 className="text-xl font-semibold text-gray-900 mb-1 truncate">{title}</h3>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            {isAdmin && isAccessible ? (
                              <EditableField
                                value={item["Artiste / Dates"] || item.designer || "Designer inconnu"}
                                onSave={(newValue) => onItemUpdate?.(item._id, { designer: newValue })}
                                className="font-medium"
                              />
                            ) : (
                              <span className="font-medium">
                                {item["Artiste / Dates"] || item.designer || "Designer inconnu"}
                              </span>
                            )}

                            {item.annee && (
                              <>
                                <span>•</span>
                                {isAdmin && isAccessible ? (
                                  <EditableField
                                    value={item.annee}
                                    onSave={(newValue) => onItemUpdate?.(item._id, { annee: newValue })}
                                  />
                                ) : (
                                  <span>{item.annee}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {isAccessible && (
                          <div className="flex items-center gap-2 ml-4">
                            <FavoriteToggleButton
                              itemId={item._id}
                              initialFavorite={item.isFavorite}
                              onToggle={(isFavorite) => onItemUpdate?.(item._id, { isFavorite })}
                            />
                            {isAdmin && (
                              <DeleteLuminaireButton
                                luminaireId={item._id}
                                luminaireName={title}
                                onDelete={() => window.location.reload()}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.materiaux && (
                          <Badge variant="secondary" className="text-xs">
                            {item.materiaux}
                          </Badge>
                        )}
                        {item.dimensions && (
                          <Badge variant="outline" className="text-xs">
                            {item.dimensions}
                          </Badge>
                        )}
                      </div>

                      {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}

                      {!isAccessible && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            🔒 Premium requis
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardWrapper>
          )
        })}

        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={lightboxImage}
          title={lightboxTitle}
        />
      </div>
    )
  }

  // Vue grille
  const gridCols = {
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
    8: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-6`}>
      {items.map((item, index) => {
        const isAccessible = isUserFree ? index < freeUserLimit : true
        const imageUrl = item.filename ? `/api/images/filename/${item.filename}` : "/placeholder.svg"
        const title = item["Nom luminaire"] || item.nom || "Sans nom"

        const CardWrapper = isAccessible ? Link : "div"

        return (
          <CardWrapper key={item._id} {...(isAccessible ? { href: `/luminaires/${item._id}` } : {})}>
            <Card
              className={`group transition-all ${
                isAccessible ? "hover:shadow-lg cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
              }`}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt={title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                    }}
                  />

                  {isAccessible && (
                    <>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openLightbox(imageUrl, title)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FavoriteToggleButton
                          itemId={item._id}
                          initialFavorite={item.isFavorite}
                          onToggle={(isFavorite) => onItemUpdate?.(item._id, { isFavorite })}
                          variant="overlay"
                        />
                      </div>
                    </>
                  )}

                  {!isAccessible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">🔒 Premium requis</Badge>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {isAdmin && isAccessible ? (
                        <EditableField
                          value={title}
                          onSave={(newValue) => onItemUpdate?.(item._id, { nom: newValue })}
                          className="font-semibold text-gray-900 mb-1"
                        />
                      ) : (
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">{title}</h3>
                      )}

                      <div className="text-sm text-gray-600 mb-2">
                        {isAdmin && isAccessible ? (
                          <EditableField
                            value={item["Artiste / Dates"] || item.designer || "Designer inconnu"}
                            onSave={(newValue) => onItemUpdate?.(item._id, { designer: newValue })}
                            className="font-medium"
                          />
                        ) : (
                          <span className="font-medium">
                            {item["Artiste / Dates"] || item.designer || "Designer inconnu"}
                          </span>
                        )}

                        {item.annee && (
                          <>
                            <span className="mx-1">•</span>
                            {isAdmin && isAccessible ? (
                              <EditableField
                                value={item.annee}
                                onSave={(newValue) => onItemUpdate?.(item._id, { annee: newValue })}
                              />
                            ) : (
                              <span>{item.annee}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isAdmin && isAccessible && (
                      <DeleteLuminaireButton
                        luminaireId={item._id}
                        luminaireName={title}
                        onDelete={() => window.location.reload()}
                        variant="ghost"
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.materiaux && (
                      <Badge variant="secondary" className="text-xs">
                        {item.materiaux}
                      </Badge>
                    )}
                    {item.dimensions && (
                      <Badge variant="outline" className="text-xs">
                        {item.dimensions}
                      </Badge>
                    )}
                  </div>

                  {item.description && <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>}
                </div>
              </CardContent>
            </Card>
          </CardWrapper>
        )
      })}

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
      />
    </div>
  )
}
