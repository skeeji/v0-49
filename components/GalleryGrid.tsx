"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { Lightbox } from "@/components/Lightbox"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const { user, userData } = useAuth()

  // Charger les favoris depuis la base de données pour les utilisateurs connectés
  useEffect(() => {
    const loadFavorites = async () => {
      if (user?.email) {
        try {
          const response = await fetch(`/api/users/favorites?email=${encodeURIComponent(user.email)}`)
          const data = await response.json()
          if (data.success) {
            setFavorites(data.favorites || [])
          }
        } catch (error) {
          console.error("❌ Erreur chargement favoris:", error)
        }
      }
    }

    loadFavorites()
  }, [user?.email])

  const toggleFavorite = async (id: string) => {
    if (!user?.email) return

    const isCurrentlyFavorite = favorites.includes(id)
    const action = isCurrentlyFavorite ? "remove" : "add"

    try {
      const response = await fetch("/api/users/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          luminaireId: id,
          action,
        }),
      })

      const data = await response.json()
      if (data.success) {
        const newFavorites = isCurrentlyFavorite ? favorites.filter((fav) => fav !== id) : [...favorites, id]
        setFavorites(newFavorites)
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour favoris:", error)
    }
  }

  // Fonction pour obtenir l'URL de l'image
  const getImageUrl = (item: any) => {
    if (item["Nom du fichier"]) {
      if (item["Nom du fichier"].startsWith("http")) {
        return item["Nom du fichier"]
      }
      return `/api/images/filename/${item["Nom du fichier"]}`
    }

    if (item.filename) {
      if (item.filename.startsWith("http")) {
        return item.filename
      }
      return `/api/images/filename/${item.filename}`
    }

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
      if (item.image.includes(".")) {
        return `/api/images/filename/${item.image}`
      }
      return `/api/images/${item.image}`
    }

    return "/placeholder.svg?height=300&width=300"
  }

  const handleDeleteLuminaire = async (luminaireId: string) => {
    try {
      const response = await fetch(`/api/luminaires/${luminaireId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        // Recharger la page pour mettre à jour la liste
        window.location.reload()
      } else {
        console.error("❌ Erreur suppression:", data.error)
      }
    } catch (error) {
      console.error("❌ Erreur suppression:", error)
    }
  }

  // Vérifier si l'utilisateur peut voir les favoris (connecté et pas gratuit)
  const canUseFavorites = user && userData?.role !== "free"

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item, index) => {
          const itemId = String(item.id || item._id || "")
          const itemName = String(item.name || item.nom || "Nom du luminaire")
          const itemDesigner = String(item.artist || item.designer || "Non renseigné")
          const itemYear = String(item.year || item.annee || "Non renseigné")
          const isAccessible = isUserFree ? index < freeUserLimit : true
          const CardWrapper = isAccessible ? Link : "div"

          return (
            <CardWrapper key={itemId} {...(isAccessible ? { href: `/luminaires/${itemId}` } : {})}>
              <div
                className={`bg-white rounded-xl p-6 shadow-lg transition-shadow ${
                  isAccessible ? "hover:shadow-xl cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                }`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 h-48 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={getImageUrl(item) || "/placeholder.svg"}
                      alt={itemName}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        console.log("❌ Erreur chargement image:", getImageUrl(item))
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=300&width=300"
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-serif text-gray-900">{itemName}</h3>

                      {isAccessible && (
                        <div className="flex items-center gap-2">
                          {canUseFavorites && (
                            <FavoriteToggleButton
                              isActive={favorites.includes(itemId)}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(itemId)
                              }}
                            />
                          )}
                          <Button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setLightboxImage(getImageUrl(item))
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {userData?.role === "admin" && (
                            <DeleteLuminaireButton
                              luminaireId={itemId}
                              luminaireName={itemName}
                              onDelete={() => handleDeleteLuminaire(itemId)}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Affichage simplifié : seulement nom, artiste et année */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Artiste</label>
                        <p className="text-gray-900">{itemDesigner}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                        <p className="text-gray-900">{itemYear}</p>
                      </div>
                    </div>

                    {!isAccessible && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">🔒 Premium requis</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardWrapper>
          )
        })}

        {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </div>
    )
  }

  // Correction du mapping des colonnes pour afficher le bon nombre
  const getGridClass = (cols: number) => {
    switch (cols) {
      case 3:
        return "grid-cols-2 sm:grid-cols-3"
      case 4:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
      case 5:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      case 6:
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      case 8:
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    }
  }

  return (
    <div className={`grid ${getGridClass(columns)} gap-2 md:gap-3`}>
      {items.map((item, index) => {
        const itemId = String(item.id || item._id || "")
        const itemName = String(item.name || item.nom || "Nom du luminaire")
        const itemDesigner = String(item.artist || item.designer || "Artiste non renseigné")
        const itemYear = String(item.year || item.annee || "Année inconnue")
        const isAccessible = isUserFree ? index < freeUserLimit : true
        const CardWrapper = isAccessible ? Link : "div"

        return (
          <CardWrapper key={itemId} {...(isAccessible ? { href: `/luminaires/${itemId}` } : {})}>
            <div
              className={`bg-white rounded-lg overflow-hidden shadow-md transition-shadow ${
                isAccessible ? "hover:shadow-lg cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
              }`}
            >
              <div className="aspect-square relative bg-gray-100">
                <Image
                  src={getImageUrl(item) || "/placeholder.svg"}
                  alt={itemName}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.log("❌ Erreur chargement image:", getImageUrl(item))
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=300&width=300"
                  }}
                />

                {isAccessible && canUseFavorites && (
                  <div className="absolute top-2 right-2">
                    <FavoriteToggleButton
                      isActive={favorites.includes(itemId)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(itemId)
                      }}
                    />
                  </div>
                )}

                {!isAccessible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">🔒 Premium</span>
                  </div>
                )}
              </div>

              <div className="p-2 space-y-0.5">
                <h3 className="font-serif text-xs md:text-sm text-gray-900 truncate">{itemName}</h3>

                <p className="text-gray-600 text-xs truncate">{itemDesigner}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{itemYear}</span>
                  {isAccessible && (
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setLightboxImage(getImageUrl(item))
                        }}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {userData?.role === "admin" && (
                        <DeleteLuminaireButton
                          luminaireId={itemId}
                          luminaireName={itemName}
                          onDelete={() => handleDeleteLuminaire(itemId)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardWrapper>
        )
      })}

      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
