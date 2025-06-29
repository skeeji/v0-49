"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Calendar, Grid } from "lucide-react"

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

interface TimelineData {
  [year: string]: LuminaireData[]
}

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<TimelineData>({})
  const [filteredData, setFilteredData] = useState<TimelineData>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline")
  const [isLoading, setIsLoading] = useState(true)
  const [totalLuminaires, setTotalLuminaires] = useState(0)

  useEffect(() => {
    async function fetchTimelineData() {
      setIsLoading(true)
      try {
        console.log("📅 Chargement des données chronologie...")

        // Charger TOUS les luminaires
        const response = await fetch("/api/luminaires?limit=10000")
        const result = await response.json()

        if (result.success && result.luminaires) {
          console.log(`📊 ${result.luminaires.length} luminaires chargés pour la chronologie`)

          // Organiser par année
          const organized: TimelineData = {}

          result.luminaires.forEach((luminaire: LuminaireData) => {
            // Extraire l'année de différentes sources
            const year = luminaire["Année"] || luminaire.annee || ""

            // Nettoyer l'année (extraire les 4 chiffres)
            const yearMatch = year.toString().match(/\b(19|20)\d{2}\b/)
            const cleanYear = yearMatch ? yearMatch[0] : ""

            if (cleanYear) {
              if (!organized[cleanYear]) {
                organized[cleanYear] = []
              }
              organized[cleanYear].push(luminaire)
            } else {
              // Mettre les luminaires sans année dans "Année inconnue"
              if (!organized["Année inconnue"]) {
                organized["Année inconnue"] = []
              }
              organized["Année inconnue"].push(luminaire)
            }
          })

          // Trier les années
          const sortedData: TimelineData = {}
          const sortedYears = Object.keys(organized)
            .filter((year) => year !== "Année inconnue")
            .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))

          // Ajouter les années triées
          sortedYears.forEach((year) => {
            sortedData[year] = organized[year]
          })

          // Ajouter "Année inconnue" à la fin
          if (organized["Année inconnue"]) {
            sortedData["Année inconnue"] = organized["Année inconnue"]
          }

          setTimelineData(sortedData)
          setFilteredData(sortedData)
          setTotalLuminaires(result.luminaires.length)

          console.log(`✅ Chronologie organisée: ${Object.keys(sortedData).length} années`)
        }
      } catch (error) {
        console.error("❌ Erreur chargement chronologie:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimelineData()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(timelineData)
      return
    }

    const filtered: TimelineData = {}
    const searchLower = searchTerm.toLowerCase()

    Object.entries(timelineData).forEach(([year, luminaires]) => {
      const filteredLuminaires = luminaires.filter((luminaire) => {
        const name = (luminaire["Nom luminaire"] || luminaire.nom || "").toLowerCase()
        const artist = (luminaire["Artiste / Dates"] || luminaire.designer || "").toLowerCase()
        return name.includes(searchLower) || artist.includes(searchLower)
      })

      if (filteredLuminaires.length > 0) {
        filtered[year] = filteredLuminaires
      }
    })

    setFilteredData(filtered)
  }, [searchTerm, timelineData])

  const years = Object.keys(filteredData)
  const totalFiltered = Object.values(filteredData).reduce((sum, luminaires) => sum + luminaires.length, 0)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">Chargement de la chronologie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-gray-900 mb-4">Chronologie des Luminaires</h1>
          <p className="text-lg text-gray-600 mb-6">Découvrez l'évolution des luminaires à travers les époques</p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant={viewMode === "timeline" ? "default" : "outline"}
                onClick={() => setViewMode("timeline")}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Chronologie
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                className="flex items-center gap-2"
              >
                <Grid className="w-4 h-4" />
                Grille
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              {totalFiltered} luminaires sur {totalLuminaires} • {years.length} années
            </div>
          </div>

          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher par nom ou artiste..."
            className="max-w-md mx-auto"
          />
        </div>

        {/* Contenu */}
        {years.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">Aucun luminaire trouvé</p>
          </div>
        ) : (
          <div className="space-y-8">
            {years.map((year) => (
              <TimelineBlock key={year} year={year} luminaires={filteredData[year]} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
