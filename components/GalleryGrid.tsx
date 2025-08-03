"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
  columns: number
  freeUserLimit: number
  isUserFree: boolean
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns, freeUserLimit, isUserFree }: GalleryGridProps) {
  const { userData } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])

  const isAdmin = userData?.role === "admin"
  const canSeeFavorites = userData?.role === "admin" || userData?.role === "premium"

  // Charger les favoris depuis localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFavorites = localStorage.getItem("favorites")
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites))
      }
    }
  }, [])

  const handleFavoriteToggle = (itemId: string) => {
    const newFavorites = favorites.includes(itemId) ? favorites.filter((id) => id !== itemId) : [...favorites, itemId]

    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }

  const handleDelete = async (itemId: string) => {
    try {
      // Recharger la page après suppression
      window.location.reload()
    } catch (error) {
      console.error("❌ Erreur lors de la suppression:", error)
    }
  }

  // Limiter les éléments pour les utilisateurs gratuits
  const displayedItems = isUserFree ? items.slice(0, freeUserLimit) : items

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {displayedItems.map((item, index) => (
          <Card key={item._id || item.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.nom || item.name || "Luminaire"}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-2xl text-gray-400">🏮</div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-gray-900 truncate">{item.nom || item.name || "Sans nom"}</h3>
                  <p className="text-gray-600 text-sm truncate">
                    {item.designer || item.artist || item["Artiste / Dates"] || "Designer inconnu"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {item.annee || item.year || item["Année"] || "Année inconnue"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canSeeFavorites && (
                    <FavoriteToggleButton
                      isActive={favorites.includes(String(item._id || item.id))}
                      onClick={() => handleFavoriteToggle(String(item._id || item.id))}
                    />
                  )}

                  <Link href={`/luminaires/${item._id || item.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>

                  {isAdmin && (
                    <DeleteLuminaireButton
                      luminaireId={String(item._id || item.id)}
                      luminaireName={item.nom || item.name || "Sans nom"}
                      onDelete={() => handleDelete(String(item._id || item.id))}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {isUserFree && items.length > freeUserLimit && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Vous avez atteint la limite de {freeUserLimit} luminaires pour les comptes gratuits.
            </p>
            <Link href="/pricing">
              <Button>Passer à Premium</Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {displayedItems.map((item, index) => (
          <Card key={item._id || item.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square relative bg-gray-100">
              {item.image ? (
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.nom || item.name || "Luminaire"}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl text-gray-400">🏮</div>
                </div>
              )}

              {/* Overlay avec boutons */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canSeeFavorites && (
                    <FavoriteToggleButton
                      isActive={favorites.includes(String(item._id || item.id))}
                      onClick={() => handleFavoriteToggle(String(item._id || item.id))}
                    />
                  )}

                  <Link href={`/luminaires/${item._id || item.id}`}>
                    <Button variant="outline" size="sm" className="bg-white/90 hover:bg-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>

                  {isAdmin && (
                    <DeleteLuminaireButton
                      luminaireId={String(item._id || item.id)}
                      luminaireName={item.nom || item.name || "Sans nom"}
                      onDelete={() => handleDelete(String(item._id || item.id))}
                    />
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="font-serif text-lg text-gray-900 truncate mb-1">{item.nom || item.name || "Sans nom"}</h3>
              <p className="text-gray-600 text-sm truncate mb-1">
                {item.designer || item.artist || item["Artiste / Dates"] || "Designer inconnu"}
              </p>
              <p className="text-gray-500 text-sm">{item.annee || item.year || item["Année"] || "Année inconnue"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isUserFree && items.length > freeUserLimit && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Vous avez atteint la limite de {freeUserLimit} luminaires pour les comptes gratuits.
          </p>
          <Link href="/pricing">
            <Button>Passer à Premium</Button>
          </Link>
        </div>
      )}
    </>
  )
}
