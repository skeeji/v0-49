"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"

interface Luminaire {
  _id: string
  id: string
  "Nom luminaire": string
  "Artiste / Dates": string
  Année: string
  Période: string
  "Nom du fichier": string
  image?: string
}

interface PeriodData {
  period: string
  years: string
  description: string
  luminaires: Luminaire[]
  imageUrl?: string
}

const periods = [
  { name: "Moyen-Age", years: "476 - 1492", description: "Période médiévale caractérisée par l'art roman et gothique" },
  { name: "XVIe siècle", years: "1501 - 1600", description: "Renaissance et redécouverte de l'art antique" },
  { name: "XVIIe siècle", years: "1601 - 1700", description: "Baroque et classicisme français" },
  { name: "XVIIIe siècle", years: "1701 - 1800", description: "Siècle des Lumières et style rococo" },
  { name: "XIXe siècle", years: "1801 - 1900", description: "Révolution industrielle et éclectisme" },
  { name: "Art Nouveau", years: "1890 - 1910", description: "Mouvement artistique inspiré par la nature" },
  { name: "Art Déco", years: "1920 - 1940", description: "Style décoratif moderne et géométrique" },
  { name: "1940 - 1949", years: "1940 - 1949", description: "Période de guerre et de reconstruction" },
  { name: "1950 - 1959", years: "1950 - 1959", description: "Design moderne et fonctionnalisme" },
  { name: "1960 - 1969", years: "1960 - 1969", description: "Pop art et design expérimental" },
  { name: "1970 - 1979", years: "1970 - 1979", description: "Design postmoderne et écologique" },
  { name: "1980 - 1989", years: "1980 - 1989", description: "High-tech et design industriel" },
  { name: "1990 - 1999", years: "1990 - 1999", description: "Minimalisme et design numérique" },
  { name: "Contemporain", years: "2000 - aujourd'hui", description: "Design durable et nouvelles technologies" },
]

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<PeriodData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTimelineData() {
      try {
        console.log("📅 Chargement des données chronologiques...")

        // Charger les luminaires
        const luminairesResponse = await fetch("/api/luminaires?limit=10000")
        const luminairesData = await luminairesResponse.json()

        // Charger les images de périodes
        const periodImagesResponse = await fetch("/api/period-images")
        const periodImagesData = await periodImagesResponse.json()

        console.log("🖼️ Images de périodes:", periodImagesData)

        if (luminairesData.success) {
          const luminaires = luminairesData.luminaires

          // Grouper les luminaires par période
          const periodGroups: { [key: string]: Luminaire[] } = {}

          luminaires.forEach((lum: any) => {
            const period = lum["Période"] || "Contemporain"
            if (!periodGroups[period]) {
              periodGroups[period] = []
            }

            // Adapter les données pour l'affichage
            const adaptedLum: Luminaire = {
              ...lum,
              id: lum._id,
              image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : undefined,
            }

            periodGroups[period].push(adaptedLum)
          })

          // Créer les données de timeline
          const timeline: PeriodData[] = periods
            .map((period) => ({
              period: period.name,
              years: period.years,
              description: period.description,
              luminaires: periodGroups[period.name] || [],
              imageUrl: periodImagesData.success ? periodImagesData.images[period.name] : undefined,
            }))
            .filter((data) => data.luminaires.length > 0) // Garder seulement les périodes avec des luminaires

          console.log(`✅ Timeline créée avec ${timeline.length} périodes`)
          setTimelineData(timeline)
        }
      } catch (error) {
        console.error("❌ Erreur chargement timeline:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTimelineData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la chronologie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-6">Chronologie des Luminaires</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez l'évolution du design luminaire à travers les époques, des créations médiévales aux innovations
            contemporaines.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Ligne verticale centrale */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-orange-400 to-amber-500 h-full z-10"></div>

          <div className="space-y-16">
            {timelineData.map((data, index) => (
              <TimelineBlock
                key={data.period}
                period={data.period}
                years={data.years}
                description={data.description}
                luminaires={data.luminaires}
                imageUrl={data.imageUrl}
                isLeft={index % 2 === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
