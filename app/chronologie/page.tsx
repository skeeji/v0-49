"use client"

import { useState, useEffect } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { useAuth } from "@/contexts/AuthContext"

export default function ChronologiePage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [yearRange, setYearRange] = useState([1800, 2024])
  const [isLoading, setIsLoading] = useState(true)
  const { userData } = useAuth()

  useEffect(() => {
    async function fetchLuminaires() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/luminaires?limit=1000")
        const data = await response.json()

        if (data.success) {
          // CORRECTION: Filtrer seulement les luminaires avec une année valide
          const luminairesWithYear = data.luminaires.filter((luminaire: any) => {
            return luminaire.annee && luminaire.annee !== null && !isNaN(luminaire.annee) && luminaire.annee > 0
          })

          console.log(`📊 Luminaires avec année valide: ${luminairesWithYear.length}/${data.luminaires.length}`)

          // Trier par année (du plus ancien au plus récent)
          const sortedLuminaires = luminairesWithYear.sort((a: any, b: any) => {
            return (a.annee || 0) - (b.annee || 0)
          })

          // Transformer les données pour l'affichage
          const transformedLuminaires = sortedLuminaires.map((luminaire: any) => ({
            ...luminaire,
            id: luminaire._id,
            name: luminaire.nom,
            artist: luminaire.designer,
            year: luminaire.annee,
            image: luminaire["Nom du fichier"]
              ? `/api/images/filename/${luminaire["Nom du fichier"]}`
              : "/placeholder.svg",
            materials: Array.isArray(luminaire.materiaux) ? luminaire.materiaux : [],
          }))

          // Calculer la plage d'années réelle
          if (transformedLuminaires.length > 0) {
            const years = transformedLuminaires.map((l: any) => l.year).filter(Boolean)
            const minYear = Math.min(...years)
            const maxYear = Math.max(...years)
            setYearRange([minYear, maxYear])
          }

          setLuminaires(transformedLuminaires)
          setFilteredLuminaires(transformedLuminaires)
        }
      } catch (error) {
        console.error("❌ Erreur chargement luminaires:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLuminaires()
  }, [])

  useEffect(() => {
    let filtered = [...luminaires]

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (luminaire) =>
          luminaire.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.artist?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrage par designer
    if (selectedDesigner) {
      filtered = filtered.filter((luminaire) => luminaire.artist === selectedDesigner)
    }

    // Filtrage par matériau
    if (selectedMaterial) {
      filtered = filtered.filter((luminaire) =>
        luminaire.materials?.some((material: string) =>
          material.toLowerCase().includes(selectedMaterial.toLowerCase()),
        ),
      )
    }

    // Filtrage par plage d'années
    filtered = filtered.filter((luminaire) => luminaire.year >= yearRange[0] && luminaire.year <= yearRange[1])

    // Pour les utilisateurs "free", limiter à 10%
    if (userData?.role === "free") {
      filtered = filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 10))
    }

    setFilteredLuminaires(filtered)
  }, [luminaires, searchTerm, selectedDesigner, selectedMaterial, yearRange, userData])

  // Extraire les options uniques pour les filtres
  const designers = [...new Set(luminaires.map((l) => l.artist).filter(Boolean))].sort()
  const materials = [
    ...new Set(
      luminaires
        .flatMap((l) => l.materials || [])
        .filter(Boolean)
        .map((m) => m.trim()),
    ),
  ].sort()

  if (isLoading) {
    return <div className="text-center py-8">Chargement de la chronologie...</div>
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Chronologie ({filteredLuminaires.length} luminaires)</h1>

        {/* Message pour les utilisateurs "free" */}
        {userData?.role === "free" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>Vous utilisez un compte gratuit. Seuls 10% des luminaires sont affichés.</span>
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher..." />

            <DropdownFilter
              label="Designer"
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designers}
              placeholder="Tous les designers"
            />

            <DropdownFilter
              label="Matériau"
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              options={materials}
              placeholder="Tous les matériaux"
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedDesigner("")
                  setSelectedMaterial("")
                  if (luminaires.length > 0) {
                    const years = luminaires.map((l) => l.year).filter(Boolean)
                    setYearRange([Math.min(...years), Math.max(...years)])
                  }
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Slider pour les années */}
          <div className="mt-4">
            <RangeSlider
              label="Période"
              min={Math.min(...luminaires.map((l) => l.year).filter(Boolean)) || 1800}
              max={Math.max(...luminaires.map((l) => l.year).filter(Boolean)) || 2024}
              value={yearRange}
              onChange={setYearRange}
              formatValue={(value) => value.toString()}
            />
          </div>
        </div>

        {/* Grille des luminaires */}
        {filteredLuminaires.length > 0 ? (
          <GalleryGrid items={filteredLuminaires} viewMode="grid" onItemUpdate={() => {}} columns={4} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun luminaire trouvé pour cette période</p>
            <p className="text-gray-400 text-sm mt-2">Ajustez les filtres ou importez plus de données</p>
          </div>
        )}
      </div>
    </div>
  )
}
