"use client"

import Image from "next/image"
import Link from "next/link"
import { FavoriteToggleButton } from "./FavoriteToggleButton"
import { useAuth } from "@/contexts/AuthContext"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
  columns?: number
  freeUserLimit?: number
  isUserFree?: boolean
  favorites?: string[]
  onToggleFavorite?: (id: string) => void
}

export function GalleryGrid({
  items,
  viewMode,
  onItemUpdate,
  columns = 4,
  freeUserLimit = Number.POSITIVE_INFINITY,
  isUserFree = false,
  favorites = [],
  onToggleFavorite,
}: GalleryGridProps) {
  const { user } = useAuth()

  const gridColsClass = {
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    8: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  }[columns]

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item, index) => {
          const itemId = String(item._id || item.id || "")
          const isFavorite = favorites.includes(itemId)
          const isLocked = isUserFree && index >= freeUserLimit

          const itemName = String(item.nom || item["Nom luminaire"] || "Sans nom")
          const itemArtist = String(item.designer || item["Artiste / Dates"] || "")
          const itemYear = String(item.annee || item["Année"] || "")
          const itemDescription = String(item.description || item["Description"] || "")

          let imageUrl = item.image

          if (!imageUrl) {
            if (item.imageId) {
              imageUrl = `/api/images/${item.imageId}`
            } else if (item.filename || item["Nom du fichier"]) {
              const filename = item.filename || item["Nom du fichier"]
              imageUrl = `/api/images/filename/${filename}`
            }
          }

          return (
            <div
              key={itemId}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={isLocked ? "#" : `/luminaires/${itemId}`} className={isLocked ? "pointer-events-none" : ""}>
                <div className="flex gap-4 p-4">
                  <div className="relative w-32 h-32 bg-gray-100 rounded-lg flex-shrink-0">
                    {imageUrl ? (
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={itemName}
                        fill
                        className={`object-cover rounded-lg ${isLocked ? "blur-sm" : ""}`}
                        unoptimized
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl text-gray-400">🏮</div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
                        <span className="text-white text-2xl">🔒</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif text-lg text-gray-900 truncate">{itemName}</h3>
                      {user && onToggleFavorite && (
                        <FavoriteToggleButton
                          isActive={isFavorite}
                          onClick={(e) => {
                            e.preventDefault()
                            onToggleFavorite(itemId)
                          }}
                        />
                      )}
                    </div>
                    {itemArtist && <p className="text-sm text-gray-600 mb-1">{itemArtist}</p>}
                    {itemYear && <p className="text-sm text-gray-500 mb-2">{itemYear}</p>}
                    {itemDescription && <p className="text-sm text-gray-700 line-clamp-2">{itemDescription}</p>}
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`grid ${gridColsClass} gap-4`}>
      {items.map((item, index) => {
        const itemId = String(item._id || item.id || "")
        const isFavorite = favorites.includes(itemId)
        const isLocked = isUserFree && index >= freeUserLimit

        const itemName = String(item.nom || item["Nom luminaire"] || "Sans nom")
        const itemArtist = String(item.designer || item["Artiste / Dates"] || "")
        const itemYear = String(item.annee || item["Année"] || "")

        let imageUrl = item.image

        if (!imageUrl) {
          if (item.imageId) {
            imageUrl = `/api/images/${item.imageId}`
          } else if (item.filename || item["Nom du fichier"]) {
            const filename = item.filename || item["Nom du fichier"]
            imageUrl = `/api/images/filename/${filename}`
          }
        }

        return (
          <div key={itemId} className="group relative">
            <Link href={isLocked ? "#" : `/luminaires/${itemId}`} className={isLocked ? "pointer-events-none" : ""}>
              <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl || "/placeholder.svg"}
                      alt={itemName}
                      fill
                      className={`object-cover ${isLocked ? "blur-sm" : ""}`}
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl text-gray-400 mb-2">🏮</div>
                        <span className="text-sm text-gray-500">Image non disponible</span>
                      </div>
                    </div>
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                      <span className="text-white text-4xl">🔒</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-sm line-clamp-2 flex-1">{itemName}</h3>
                    {user && onToggleFavorite && (
                      <FavoriteToggleButton
                        isActive={isFavorite}
                        onClick={(e) => {
                          e.preventDefault()
                          onToggleFavorite(itemId)
                        }}
                      />
                    )}
                  </div>
                  {itemArtist && <p className="text-xs text-gray-600 line-clamp-1">{itemArtist}</p>}
                  {itemYear && <p className="text-xs text-gray-500">{itemYear}</p>}
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
