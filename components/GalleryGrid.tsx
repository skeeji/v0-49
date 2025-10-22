"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { EditableField } from "@/components/EditableField"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"
import { Lightbox } from "@/components/Lightbox"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"

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
  freeUserLimit = Number.POSITIVE_INFINITY,
  isUserFree = false,
}: GalleryGridProps) {
  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const validItems = items.filter((item) => item && (item._id || item.id))

  const visibleItems = isUserFree ? validItems.slice(0, freeUserLimit) : validItems

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }

  const images = visibleItems.map((item) => {
    const fileId = item.fileId
    const filename = item.filename || item["Nom du fichier"]

    if (fileId) {
      return `/api/images/${fileId}`
    } else if (filename) {
      return `/api/images/filename/${encodeURIComponent(filename)}`
    }
    return "/placeholder.svg"
  })

  if (viewMode === "list") {
    return (
      <>
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const itemId = String(item._id || item.id)
            const name = item.nom || item["Nom luminaire"] || "Sans nom"
            const designer = item.designer || item["Artiste / Dates"] || "Inconnu"
            const year = item.annee || item.year || ""
            const fileId = item.fileId
            const filename = item.filename || item["Nom du fichier"]

            let imageUrl = "/placeholder.svg"
            if (fileId) {
              imageUrl = `/api/images/${fileId}`
            } else if (filename) {
              imageUrl = `/api/images/filename/${encodeURIComponent(filename)}`
            }

            return (
              <Card key={itemId} className="p-4">
                <div className="flex gap-4">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <Image
                      src={imageUrl || "/placeholder.svg"}
                      alt={name}
                      fill
                      className="object-cover rounded"
                      sizes="128px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <Link href={`/luminaires/${itemId}`} className="hover:underline">
                        <h3 className="text-lg font-serif font-semibold">{name}</h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        <FavoriteToggleButton luminaireId={itemId} />
                        {isAdmin && <DeleteLuminaireButton id={itemId} />}
                      </div>
                    </div>
                    <p className="text-gray-600">{designer}</p>
                    {year && <p className="text-sm text-gray-500">{year}</p>}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
        <Lightbox
          images={images}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          initialIndex={currentImageIndex}
        />
      </>
    )
  }

  return (
    <>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item, index) => {
          const itemId = String(item._id || item.id)
          const name = item.nom || item["Nom luminaire"] || "Sans nom"
          const designer = item.designer || item["Artiste / Dates"] || "Inconnu"
          const year = item.annee || item.year || ""
          const fileId = item.fileId
          const filename = item.filename || item["Nom du fichier"]

          let imageUrl = "/placeholder.svg"
          if (fileId) {
            imageUrl = `/api/images/${fileId}`
          } else if (filename) {
            imageUrl = `/api/images/filename/${encodeURIComponent(filename)}`
          }

          return (
            <Card key={itemId} className="overflow-hidden group">
              <div className="relative aspect-square cursor-pointer" onClick={() => openLightbox(index)}>
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes={`(min-width: 1280px) ${100 / columns}vw, (min-width: 768px) 33vw, 50vw`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <FavoriteToggleButton luminaireId={itemId} />
                  {isAdmin && <DeleteLuminaireButton id={itemId} />}
                </div>
              </div>
              <div className="p-3">
                <Link href={`/luminaires/${itemId}`} className="hover:underline">
                  {isAdmin && onItemUpdate ? (
                    <EditableField
                      value={name}
                      onSave={(newValue) => onItemUpdate(itemId, { nom: newValue })}
                      className="font-serif font-semibold text-sm mb-1"
                    />
                  ) : (
                    <h3 className="font-serif font-semibold text-sm mb-1 line-clamp-2">{name}</h3>
                  )}
                </Link>
                <p className="text-xs text-gray-600 line-clamp-1">{designer}</p>
                {year && <p className="text-xs text-gray-500">{year}</p>}
              </div>
            </Card>
          )
        })}
      </div>
      <Lightbox
        images={images}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={currentImageIndex}
      />
    </>
  )
}
