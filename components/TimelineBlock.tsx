"use client"

import Image from "next/image"
import Link from "next/link"
import { EditableField } from "@/components/EditableField"

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
  onDescriptionUpdate: (periodName: string, description: string) => void
}

export function TimelineBlock({ period, isLeft, className = "", onDescriptionUpdate }: TimelineBlockProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Ligne de temps centrale */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-orange-300"></div>

      {/* Point sur la ligne de temps */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>

      <div className={`flex ${isLeft ? "flex-row" : "flex-row-reverse"} items-center gap-8`}>
        {/* Contenu */}
        <div className="w-1/2">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif text-gray-900">{period.name}</h2>
              <span className="text-sm text-gray-500">
                {period.start} - {period.end}
              </span>
            </div>

            <div className="mb-4">
              <EditableField
                value={period.description}
                onSave={(newDescription) => onDescriptionUpdate(period.name, newDescription)}
                multiline
                placeholder="Description de la période..."
              />
            </div>

            <div className="text-sm text-gray-600 mb-4">
              {period.luminaires.length} luminaire{period.luminaires.length > 1 ? "s" : ""} dans cette période
            </div>

            {/* Aperçu des luminaires */}
            {period.luminaires.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {period.luminaires.slice(0, 3).map((luminaire, idx) => (
                  <Link key={idx} href={`/luminaires/${luminaire.id}`}>
                    <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                      <Image
                        src={luminaire.image || "/placeholder.svg"}
                        alt={luminaire.nom || "Luminaire"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Espace vide de l'autre côté */}
        <div className="w-1/2"></div>
      </div>
    </div>
  )
}
