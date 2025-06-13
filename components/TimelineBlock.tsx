"use client"

import Image from "next/image"
import Link from "next/link"
import { EditableField } from "@/components/EditableField"

interface TimelineBlockProps {
  period: {
    name: string
    start: number
    end: number
    luminaires: any[]
    description: string
  }
  isLeft: boolean
  className?: string
  onDescriptionUpdate: (periodName: string, description: string) => void
}

export function TimelineBlock({ period, isLeft, className = "", onDescriptionUpdate }: TimelineBlockProps) {
  // Supprimer les doublons basés sur l'ID
  const uniqueLuminaires = period.luminaires.filter(
    (luminaire, index, self) => index === self.findIndex((l) => l.id === luminaire.id),
  )

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-orange hidden lg:block" />

      {/* Timeline dot */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-orange rounded-full border-4 border-white shadow-lg hidden lg:block" />

      <div className={`lg:w-1/2 ${isLeft ? "lg:pr-12" : "lg:ml-auto lg:pl-12"}`}>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="mb-6">
            <h3 className="text-2xl font-playfair text-dark mb-2">{period.name}</h3>
            <p className="text-orange font-medium">
              {period.start} - {period.end}
            </p>
            <p className="text-gray-600 mt-2">
              {uniqueLuminaires.length} luminaire{uniqueLuminaires.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Description éditable */}
          <div className="mb-6 p-4 bg-cream rounded-lg">
            <EditableField
              value={period.description}
              onSave={(value) => onDescriptionUpdate(period.name, value)}
              placeholder="Description de la période..."
              multiline
              className="text-sm text-gray-700 leading-relaxed"
            />
          </div>

          {uniqueLuminaires.length > 0 && (
            <>
              <h4 className="font-medium text-gray-700 mb-4">Luminaires de la période</h4>

              {/* Desktop: Carousel avec 3 éléments */}
              <div className="hidden md:block">
                <div className="grid grid-cols-3 gap-4">
                  {uniqueLuminaires.slice(0, 3).map((luminaire, index) => (
                    <Link key={luminaire.id} href={`/luminaires/${luminaire.id}`}>
                      <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                        <Image
                          src={luminaire.image || "/placeholder.svg?height=150&width=150"}
                          alt={luminaire.name || "Luminaire"}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                          <p className="text-xs font-medium truncate">{luminaire.name || "Sans nom"}</p>
                          <p className="text-xs text-gray-300 truncate">{luminaire.artist || ""}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {uniqueLuminaires.length > 3 && (
                  <div className="mt-4 text-center">
                    <Link href={`/luminaires?period=${encodeURIComponent(period.name)}`}>
                      <span className="text-orange hover:text-orange/80 text-sm font-medium">
                        Voir tous les luminaires de cette période ({uniqueLuminaires.length}) →
                      </span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile: 2 colonnes */}
              <div className="md:hidden grid grid-cols-2 gap-4">
                {uniqueLuminaires.slice(0, 4).map((luminaire, index) => (
                  <Link key={luminaire.id} href={`/luminaires/${luminaire.id}`}>
                    <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer">
                      <Image
                        src={luminaire.image || "/placeholder.svg?height=150&width=150"}
                        alt={luminaire.name || "Luminaire"}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                        <p className="text-xs font-medium truncate">{luminaire.name || "Sans nom"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
