"use client"

import { useState, useEffect, useMemo } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { SortSelector } from "@/components/SortSelector"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { RoleGuard } from "@/components/RoleGuard"

interface Luminaire {
  _id: string
  nom?: string
  "Nom luminaire"?: string
  designer?: string
  "Artiste / Dates"?: string
  annee?: number
  Année?: string
  periode?: string
  Spécialité?: string
  materiaux?: string[]
  Matériaux?: string
  couleurs?: string[]
  filename?: string
  "Nom du fichier"?: string
  images?: string[]
  isFavorite?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortBy, setSortBy] = useState("nom")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50

  const { userData } = useAuth()

  // Récupérer tous les luminaires au chargement initial
  useEffect(() => {
    async function fetchLuminaires() {
      setIsLoading(true)
      try {
        console.log("🔍 Chargement de tous les luminaires...")
        const response = await fetch("/api/luminaires?limit=9999")
        const data = await response.json()

        if (data.success) {
          console.log(`✅ ${data.luminaires.length} luminaires chargés`)
          setLuminaires(data.luminaires)
          setTotalCount(data.luminaires.length)
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des luminaires:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLuminaires()
  }, [])

  // Filtrer et trier les luminaires
  const processedLuminaires = useMemo(() => {
    let filtered = [...luminaires]

    // Filtrage par recherche (recherche dans tous les luminaires, pas de limite par slider)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((luminaire) => {
        const nom = String(luminaire.nom || luminaire["Nom luminaire"] || "").toLowerCase()
        const designer = String(luminaire.designer || luminaire["Artiste / Dates"] || "").toLowerCase()
        const periode = String(luminaire.periode || luminaire["Spécialité"] || "").toLowerCase()
        const materiaux = Array.isArray(luminaire.materiaux)
          ? luminaire.materiaux.join(" ").toLowerCase()
          : String(luminaire["Matériaux"] || "").toLowerCase()

        return (
          nom.includes(searchLower) ||
          designer.includes(searchLower) ||
          periode.includes(searchLower) ||
          materiaux.includes(searchLower)
        )
      })
    }

    // Filtrage par designer
    if (selectedDesigner) {
      filtered = filtered.filter((luminaire) => {
        const designer = String(luminaire.designer || luminaire["Artiste / Dates"] || "")
        return designer === selectedDesigner
      })
    }

    // Filtrage par période
    if (selectedPeriod) {
      filtered = filtered.filter((luminaire) => {
        const periode = String(luminaire.periode || luminaire["Spécialité"] || "")
        return periode === selectedPeriod
      })
    }

    // Filtrage par matériau
    if (selectedMaterial) {
      filtered = filtered.filter((luminaire) => {
        if (Array.isArray(luminaire.materiaux)) {
          return luminaire.materiaux.includes(selectedMaterial)
        }
        const materiaux = String(luminaire["Matériaux"] || "")
        return materiaux.includes(selectedMaterial)
      })
    }

    // Filtrage par couleur
    if (selectedColor) {
      filtered = filtered.filter((luminaire) => {
        if (Array.isArray(luminaire.couleurs)) {
          return luminaire.couleurs.includes(selectedColor)
        }
        return false
      })
    }

    // Filtrage par année SEULEMENT si le slider a été modifié
    if (sliderModified) {
      filtered = filtered.filter((luminaire) => {
        const annee = luminaire.annee || Number.parseInt(String(luminaire["Année"] || "0"))
        return annee >= yearRange[0] && annee <= yearRange[1]
      })
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: string | number = ""
      let bValue: string | number = ""

      switch (sortBy) {
        case "nom":
          aValue = String(a.nom || a["Nom luminaire"] || "").toLowerCase()
          bValue = String(b.nom || b["Nom luminaire"] || "").toLowerCase()
          break
        case "designer":
          aValue = String(a.designer || a["Artiste / Dates"] || "").toLowerCase()
          bValue = String(b.designer || b["Artiste / Dates"] || "").toLowerCase()
          break
        case "annee":
          aValue = a.annee || Number.parseInt(String(a["Année"] || "0"))
          bValue = b.annee || Number.parseInt(String(b["Année"] || "0"))
          break
        case "periode":
          aValue = String(a.periode || a["Spécialité"] || "").toLowerCase()
          bValue = String(b.periode || b["Spécialité"] || "").toLowerCase()
          break
        default:
          aValue = String(a.nom || a["Nom luminaire"] || "").toLowerCase()
          bValue = String(b.nom || b["Nom luminaire"] || "").toLowerCase()
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [
    luminaires,
    searchTerm,
    selectedDesigner,
    selectedPeriod,
    selectedMaterial,
    selectedColor,
    yearRange,
    sliderModified,
    sortBy,
    sortOrder,
  ])

  // Pagination
  const paginatedLuminaires = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return processedLuminaires.slice(startIndex, startIndex + itemsPerPage)
  }, [processedLuminaires, currentPage])

  // Extraire les options uniques pour les filtres
  const filterOptions = useMemo(() => {
    const designers = new Set<string>()
    const periods = new Set<string>()
    const materials = new Set<string>()
    const colors = new Set<string>()

    luminaires.forEach((luminaire) => {
      const designer = String(luminaire.designer || luminaire["Artiste / Dates"] || "").trim()
      const periode = String(luminaire.periode || luminaire["Spécialité"] || "").trim()

      if (designer) designers.add(designer)
      if (periode) periods.add(periode)

      if (Array.isArray(luminaire.materiaux)) {
        luminaire.materiaux.forEach((mat) => materials.add(mat))
      } else if (luminaire["Matériaux"]) {
        String(luminaire["Matériaux"])
          .split(",")
          .forEach((mat) => materials.add(mat.trim()))
      }

      if (Array.isArray(luminaire.couleurs)) {
        luminaire.couleurs.forEach((color) => colors.add(color))
      }
    })

    return {
      designers: Array.from(designers).sort(),
      periods: Array.from(periods).sort(),
      materials: Array.from(materials).sort(),
      colors: Array.from(colors).sort(),
    }
  }, [luminaires])

  const handleYearRangeChange = (newRange: [number, number]) => {
    setYearRange(newRange)
    setSliderModified(true)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriod("")
    setSelectedMaterial("")
    setSelectedColor("")
    setYearRange([1900, 2024])
    setSliderModified(false)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(processedLuminaires.length / itemsPerPage)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Chargement des luminaires...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Luminaires</h1>
          <p className="text-gray-600">
            {processedLuminaires.length} luminaire{processedLuminaires.length > 1 ? "s" : ""} trouvé
            {processedLuminaires.length > 1 ? "s" : ""} sur {totalCount}
          </p>
        </div>

        <RoleGuard allowedRoles={["admin"]}>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un luminaire
          </Button>
        </RoleGuard>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

          <DropdownFilter
            label="Designer"
            value={selectedDesigner}
            onChange={setSelectedDesigner}
            options={filterOptions.designers}
          />

          <DropdownFilter
            label="Période"
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={filterOptions.periods}
          />

          <DropdownFilter
            label="Matériau"
            value={selectedMaterial}
            onChange={setSelectedMaterial}
            options={filterOptions.materials}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RangeSlider label="Année" min={1900} max={2024} value={yearRange} onChange={handleYearRangeChange} />

          <SortSelector sortBy={sortBy} sortOrder={sortOrder} onSortChange={setSortBy} onOrderChange={setSortOrder} />
        </div>

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={resetFilters}>
            Réinitialiser les filtres
          </Button>

          {sliderModified && (
            <p className="text-sm text-gray-600">
              Filtrage par année actif: {yearRange[0]} - {yearRange[1]}
            </p>
          )}
        </div>
      </div>

      {/* Grille des luminaires */}
      <GalleryGrid luminaires={paginatedLuminaires} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal d'ajout */}
      <LuminaireFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          // Recharger les luminaires
          window.location.reload()
        }}
      />
    </div>
  )
}
