"use client"

import { useState, useEffect, useMemo } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { RangeSlider } from "@/components/RangeSlider"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

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
  isFavorite?: boolean
}

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [yearRange, setYearRange] = useState([1800, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const { userData } = useAuth()

  const canAdd = userData?.role === "admin"

  // Récupérer tous les luminaires
  useEffect(() => {
    async function fetchLuminaires() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/luminaires?limit=9999")
        const data = await response.json()

        if (data.success) {
          setLuminaires(data.luminaires)
          console.log(`✅ ${data.luminaires.length} luminaires chargés`)
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

    // Filtrage par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((luminaire) => {
        const nom = luminaire.nom || luminaire["Nom luminaire"] || ""
        const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
        const periode = luminaire.periode || luminaire["Spécialité"] || ""

        return (
          nom.toLowerCase().includes(term) ||
          designer.toLowerCase().includes(term) ||
          periode.toLowerCase().includes(term)
        )
      })
    }

    // Filtrage par designer
    if (selectedDesigner) {
      filtered = filtered.filter((luminaire) => {
        const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
        return designer === selectedDesigner
      })
    }

    // Filtrage par période
    if (selectedPeriod) {
      filtered = filtered.filter((luminaire) => {
        const periode = luminaire.periode || luminaire["Spécialité"] || ""
        return periode === selectedPeriod
      })
    }

    // Filtrage par matériau
    if (selectedMaterial) {
      filtered = filtered.filter((luminaire) => {
        const materiaux = luminaire.materiaux || []
        const materiauxString = luminaire["Matériaux"] || ""
        return (
          materiaux.includes(selectedMaterial) || materiauxString.toLowerCase().includes(selectedMaterial.toLowerCase())
        )
      })
    }

    // Filtrage par couleur
    if (selectedColor) {
      filtered = filtered.filter((luminaire) => {
        const couleurs = luminaire.couleurs || []
        return couleurs.includes(selectedColor)
      })
    }

    // Filtrage par année SEULEMENT si le slider a été modifié
    if (sliderModified) {
      filtered = filtered.filter((luminaire) => {
        const annee = luminaire.annee || Number.parseInt(luminaire["Année"] || "0")
        return annee >= yearRange[0] && annee <= yearRange[1]
      })
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          const nomA = a.nom || a["Nom luminaire"] || ""
          const nomB = b.nom || b["Nom luminaire"] || ""
          return nomA.localeCompare(nomB)
        case "designer":
          const designerA = a.designer || a["Artiste / Dates"] || ""
          const designerB = b.designer || b["Artiste / Dates"] || ""
          return designerA.localeCompare(designerB)
        case "annee":
          const anneeA = a.annee || Number.parseInt(a["Année"] || "0")
          const anneeB = b.annee || Number.parseInt(b["Année"] || "0")
          return anneeA - anneeB
        case "periode":
          const periodeA = a.periode || a["Spécialité"] || ""
          const periodeB = b.periode || b["Spécialité"] || ""
          return periodeA.localeCompare(periodeB)
        default:
          return 0
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
    sortBy,
    yearRange,
    sliderModified,
  ])

  // Extraire les options uniques pour les filtres
  const designers = useMemo(() => {
    const designerSet = new Set<string>()
    luminaires.forEach((luminaire) => {
      const designer = luminaire.designer || luminaire["Artiste / Dates"]
      if (designer && designer.trim()) {
        designerSet.add(designer.trim())
      }
    })
    return Array.from(designerSet).sort()
  }, [luminaires])

  const periods = useMemo(() => {
    const periodSet = new Set<string>()
    luminaires.forEach((luminaire) => {
      const periode = luminaire.periode || luminaire["Spécialité"]
      if (periode && periode.trim()) {
        periodSet.add(periode.trim())
      }
    })
    return Array.from(periodSet).sort()
  }, [luminaires])

  const materials = useMemo(() => {
    const materialSet = new Set<string>()
    luminaires.forEach((luminaire) => {
      if (luminaire.materiaux) {
        luminaire.materiaux.forEach((material) => materialSet.add(material))
      }
      if (luminaire["Matériaux"]) {
        const materiaux = luminaire["Matériaux"].split(",").map((m) => m.trim())
        materiaux.forEach((material) => materialSet.add(material))
      }
    })
    return Array.from(materialSet).sort()
  }, [luminaires])

  const colors = useMemo(() => {
    const colorSet = new Set<string>()
    luminaires.forEach((luminaire) => {
      if (luminaire.couleurs) {
        luminaire.couleurs.forEach((color) => colorSet.add(color))
      }
    })
    return Array.from(colorSet).sort()
  }, [luminaires])

  const handleSliderChange = (newRange: number[]) => {
    setYearRange(newRange)
    setSliderModified(true)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriod("")
    setSelectedMaterial("")
    setSelectedColor("")
    setYearRange([1800, 2024])
    setSliderModified(false)
  }

  const handleLuminaireAdded = () => {
    // Recharger les luminaires après ajout
    window.location.reload()
  }

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
          <h1 className="text-3xl font-bold mb-2">Galerie des Luminaires</h1>
          <p className="text-gray-600">
            {processedLuminaires.length} luminaire{processedLuminaires.length > 1 ? "s" : ""} sur {luminaires.length}
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un luminaire
          </Button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher par nom, designer ou période..."
        />
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <DropdownFilter
          label="Designer"
          value={selectedDesigner}
          onChange={setSelectedDesigner}
          options={designers}
          placeholder="Tous les designers"
        />
        <DropdownFilter
          label="Période"
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          options={periods}
          placeholder="Toutes les périodes"
        />
        <DropdownFilter
          label="Matériau"
          value={selectedMaterial}
          onChange={setSelectedMaterial}
          options={materials}
          placeholder="Tous les matériaux"
        />
        <DropdownFilter
          label="Couleur"
          value={selectedColor}
          onChange={setSelectedColor}
          options={colors}
          placeholder="Toutes les couleurs"
        />
        <SortSelector value={sortBy} onChange={setSortBy} />
      </div>

      {/* Slider d'années */}
      <div className="mb-6">
        <RangeSlider min={1800} max={2024} value={yearRange} onChange={handleSliderChange} label="Filtrer par année" />
        {sliderModified && (
          <p className="text-sm text-gray-600 mt-2">
            Affichage des luminaires de {yearRange[0]} à {yearRange[1]}
          </p>
        )}
      </div>

      {/* Bouton de reset */}
      <div className="mb-6">
        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser les filtres
        </Button>
      </div>

      {/* Grille des luminaires */}
      <GalleryGrid luminaires={processedLuminaires} />

      {/* Modal d'ajout */}
      {showAddModal && (
        <LuminaireFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleLuminaireAdded}
        />
      )}
    </div>
  )
}
