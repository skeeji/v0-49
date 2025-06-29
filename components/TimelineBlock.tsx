"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, ChevronUp, Calendar } from "lucide-react"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"

interface LuminaireData {
  _id: string
  "Nom luminaire"?: string
  nom?: string
  "Artiste / Dates"?: string
  designer?: string
  Année?: string
  annee?: string
  "Nom du fichier"?: string
  filename?: string
  [key: string]: any
}

interface TimelineBlockProps {
  year: string
  luminaires: LuminaireData[]
  viewMode: "timeline" | "grid"
}

export function TimelineBlock({ year, luminaires, viewMode }: TimelineBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])

  // Fonction pour obtenir l'URL de l'image
  const getImageUrl = (luminaire: LuminaireData) => {
    const filename = luminaire["Nom du fichier"] || luminaire.filename
    if (filename) {
      return `/api/images/filename/${filename}`
    }
    return "/placeholder.svg?height=300&width=300"
  }

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id) ? favorites.filter((fav) => fav !== id) : [...favorites, id]
    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }

  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h2 className="text-2xl font-serif">{year}</h2>
            </div>
            <div className="text-sm opacity-90">{luminaires.length} luminaires</div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {luminaires.map((luminaire) => (
              <Link key={luminaire._id} href={`/luminaires/${luminaire._id}`}>
                <div className="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={getImageUrl(luminaire) || "/placeholder.svg"}
                      alt={luminaire["Nom luminaire"] || luminaire.nom || "Luminaire"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <FavoriteToggleButton
                        isActive={favorites.includes(luminaire._id)}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(luminaire._id)
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-serif text-sm text-gray-900 truncate">
                      {luminaire["Nom luminaire"] || luminaire.nom || "Sans nom"}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {luminaire["Artiste / Dates"] || luminaire.designer || "Artiste inconnu"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <h2 className="text-2xl font-serif">{year}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{luminaires.length} luminaires</span>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="space-y-6">
            {luminaires.map((luminaire) => (
              <div key={luminaire._id} className="flex gap-6 p-4 bg-gray-50 rounded-lg">
                <Link href={`/luminaires/${luminaire._id}`} className="flex-shrink-0">
                  <div className="w-24 h-24 relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                    <Image
                      src={getImageUrl(luminaire) || "/placeholder.svg"}
                      alt={luminaire["Nom luminaire"] || luminaire.nom || "Luminaire"}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                      }}
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/luminaires/${luminaire._id}`}>
                        <h3 className="font-serif text-lg text-gray-900 hover:text-orange-500 cursor-pointer">
                          {luminaire["Nom luminaire"] || luminaire.nom || "Sans nom"}
                        </h3>
                      </Link>
                      <p className="text-gray-600 mt-1">
                        {luminaire["Artiste / Dates"] || luminaire.designer || "Artiste inconnu"}
                      </p>
                      {luminaire["Spécialité"] && (
                        <p className="text-sm text-gray-500 mt-2">{luminaire["Spécialité"]}</p>
                      )}
                    </div>

                    <FavoriteToggleButton
                      isActive={favorites.includes(luminaire._id)}
                      onClick={() => toggleFavorite(luminaire._id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
