"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Luminaire {
  _id: string
  id: string
  "Nom luminaire": string
  "Artiste / Dates": string
  Année: string
  image?: string
}

interface TimelineBlockProps {
  period: string
  years: string
  description: string
  luminaires: Luminaire[]
  imageUrl?: string
  isLeft: boolean
}

export function TimelineBlock({ period, years, description, luminaires, imageUrl, isLeft }: TimelineBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3
  const totalPages = Math.ceil(luminaires.length / itemsPerPage)
  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < totalPages - 1

  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const visibleLuminaires = luminaires.slice(currentIndex * itemsPerPage, (currentIndex + 1) * itemsPerPage)

  return (
    <div className="relative">
      {/* Point sur la ligne centrale */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-20"></div>

      <div className={`flex items-stretch gap-8 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
        {/* Image de période */}
        {imageUrl && (
          <div className="w-80 flex-shrink-0 hidden md:block">
            <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={`Illustration ${period}`}
                width={320}
                height={400}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log(`❌ Erreur chargement image période: ${period}`)
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-8">
          {/* Image mobile - au-dessus du contenu */}
          {imageUrl && (
            <div className="md:hidden mb-6">
              <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period}`}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log(`❌ Erreur chargement image période mobile: ${period}`)
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}

          {/* En-tête */}
          <div className="mb-6">
            <h2 className="text-3xl font-serif text-gray-900 mb-2">{period}</h2>
            <p className="text-lg text-orange-600 font-medium mb-3">{years}</p>
            <p className="text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Luminaires en carrousel */}
          {luminaires.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">Luminaires de cette période ({luminaires.length})</h3>
                {luminaires.length > itemsPerPage && (
                  <div className="flex gap-2">
                    <button
                      onClick={scrollLeft}
                      disabled={!canScrollLeft}
                      className={`p-2 rounded-full border ${
                        canScrollLeft
                          ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollRight}
                      disabled={!canScrollRight}
                      className={`p-2 rounded-full border ${
                        canScrollRight
                          ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleLuminaires.map((luminaire) => (
                  <Link
                    key={luminaire.id}
                    href={`/luminaires/${luminaire.id}`}
                    className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <div className="aspect-square bg-white">
                      {luminaire.image ? (
                        <Image
                          src={luminaire.image || "/placeholder.svg"}
                          alt={luminaire["Nom luminaire"]}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            console.log(`❌ Erreur image luminaire: ${luminaire["Nom luminaire"]}`)
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-4xl mb-2">💡</div>
                            <span className="text-sm">Image non disponible</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                        {luminaire["Nom luminaire"]}
                      </h4>
                      <p className="text-xs text-gray-600 mb-1">{luminaire["Artiste / Dates"]}</p>
                      <p className="text-xs text-orange-600">{luminaire["Année"]}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Indicateur de pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2 h-2 rounded-full ${i === currentIndex ? "bg-orange-500" : "bg-gray-300"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
