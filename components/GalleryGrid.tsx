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
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const { userData } = useAuth()

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

  const handleDeleteLuminaire = (id: string) => {
    // Recharger la page pour mettre à jour la liste
    window.location.reload()
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => {
          const itemId = String(item.id || item._id || "")
          const itemName = String(item.name || item.nom || "Nom du luminaire")
          const itemDesigner = String(item.artist || item.designer || "Non renseigné")
          const itemYear = String(item.year || item.annee || "Non renseigné")

          return (
            <div key={itemId} className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex flex-col md:flex-row gap-6">
                <Link
                  href={`/luminaires/${itemId}`}
                  className="w-full md:w-48 h-48 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                >
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
                </Link>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <Link href={`/luminaires/${itemId}`}>
                      <h3 className="text-xl font-serif text-gray-900 hover:text-orange-500 cursor-pointer">
                        {itemName}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2">
                      <FavoriteToggleButton
                        isActive={favorites.includes(itemId)}
                        onClick={() => toggleFavorite(itemId)}
                      />
                      <Button onClick={() => setLightboxImage(getImageUrl(item))} variant="outline" size="sm">
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
                </div>
              </div>
            </div>
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
      {items.map((item) => {
        const itemId = String(item.id || item._id || "")
        const itemName = String(item.name || item.nom || "Nom du luminaire")
        const itemDesigner = String(item.artist || item.designer || "Artiste non renseigné")
        const itemYear = String(item.year || item.annee || "Année inconnue")

        return (
          <div key={itemId} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <Link href={`/luminaires/${itemId}`}>
              <div className="aspect-square relative bg-gray-100 cursor-pointer hover:scale-105 transition-transform">
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
              </div>
            </Link>

            <div className="p-2 space-y-0.5">
              <Link href={`/luminaires/${itemId}`}>
                <h3 className="font-serif text-xs md:text-sm text-gray-900 hover:text-orange-500 cursor-pointer truncate">
                  {itemName}
                </h3>
              </Link>

              <p className="text-gray-600 text-xs truncate">{itemDesigner}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{itemYear}</span>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => setLightboxImage(getImageUrl(item))}
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
              </div>
            </div>
          </div>
        )
      })}

      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
