"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { EditableField } from "./EditableField"
import { ChevronDown, ChevronUp } from "lucide-react"

interface TimelineBlockProps {
  period: {
    name: string
    start: number
    end: number
    description: string
    luminaires: any[]
  }
  isLeft: boolean
  className?: string
  onDescriptionUpdate: (periodName: string, newDescription: string) => void
}

export function TimelineBlock({ period, isLeft, className = "", onDescriptionUpdate }: TimelineBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAllLuminaires, setShowAllLuminaires] = useState(false)

  const displayedLuminaires = showAllLuminaires ? period.luminaires : period.luminaires.slice(0, 6)

  return (
    <div className={`relative ${className}`}>
      {/* Ligne de temps */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-orange-300 to-orange-500"></div>

      {/* Point sur la ligne de temps */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>

      {/* Contenu */}
      <div className={`flex items-center ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
        <div className="w-1/2"></div>
        <div className={`w-1/2 ${isLeft ? "pl-12" : "pr-12"}`}>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            {/* En-tête de la période */}
            <div className="mb-4">
              <h2 className="text-2xl font-serif text-gray-900 mb-2">{period.name}</h2>
              <p className="text-sm text-gray-500">
                {period.start} - {period.end} • {period.luminaires.length} luminaire
                {period.luminaires.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Description éditable */}
            <div className="mb-4">
              <EditableField
                value={period.description}
                onSave={(newDescription) => onDescriptionUpdate(period.name, newDescription)}
                multiline
                className="text-gray-700 leading-relaxed"
              />
            </div>

            {/* Bouton pour développer/réduire */}
            {period.luminaires.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-4"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Masquer" : "Voir"} les luminaires ({period.luminaires.length})
              </button>
            )}

            {/* Grille des luminaires */}
            {isExpanded && period.luminaires.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {displayedLuminaires.map((luminaire: any) => (
                    <Link key={luminaire.id} href={`/luminaires/${luminaire.id}`}>
                      <div className="group cursor-pointer">
                        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
                          {luminaire.image ? (
                            <Image
                              src={luminaire.image || "/placeholder.svg"}
                              alt={luminaire.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                                e.currentTarget.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex items-center justify-center ${luminaire.image ? "hidden" : ""}`}
                          >
                            <div className="text-4xl text-gray-400">🏮</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{luminaire.name}</h4>
                          <p className="text-xs text-gray-600 truncate">{luminaire.artist}</p>
                          <p className="text-xs text-orange-600 font-medium">{luminaire.year}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Bouton "Voir plus" */}
                {period.luminaires.length > 6 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllLuminaires(!showAllLuminaires)}
                      className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                    >
                      {showAllLuminaires ? "Voir moins" : `Voir les ${period.luminaires.length - 6} autres`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
