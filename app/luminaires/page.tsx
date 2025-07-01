"use client"
import { useState, useEffect } from "react"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { GalleryGrid } from "@/components/GalleryGrid"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useAuth } from "@/contexts/AuthContext"

interface Luminaire {
  _id: string
  nom: string
  designer?: string
  annee?: number
  periode?: string
  description?: string
  materiaux?: string[]
  dimensions?: string
  estimation?: string
  image?: string
  isFavorite?: boolean
}

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  useEffect(() => {
    fetchLuminaires()
  }, [])

  useEffect(() => {
    filterAndSortLuminaires()
  }, [luminaires, searchTerm, selectedPeriod, selectedMaterial, sortBy])

  const fetchLuminaires = async () => {
    try {
      const response = await fetch("/api/luminaires")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLuminaires(data.luminaires)
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des luminaires:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortLuminaires = () => {
    let filtered = [...luminaires]

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (luminaire) =>
          luminaire.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.designer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrage par période
    if (selectedPeriod) {
      filtered = filtered.filter((luminaire) => luminaire.periode === selectedPeriod)
    }

    // Filtrage par matériau
    if (selectedMaterial) {
      filtered = filtered.filter((luminaire) =>
        luminaire.materiaux?.some((mat) => mat.toLowerCase().includes(selectedMaterial.toLowerCase())),
      )
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          return (a.nom || "").localeCompare(b.nom || "")
        case "designer":
          return (a.designer || "").localeCompare(b.designer || "")
        case "annee":
          return (a.annee || 0) - (b.annee || 0)
        case "periode":
          return (a.periode || "").localeCompare(b.periode || "")
        default:
          return 0
      }
    })

    setFilteredLuminaires(filtered)
  }

  const handleCreateLuminaire = async (data: any) => {
    try {
      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setLuminaires([...luminaires, result.luminaire])
          setIsModalOpen(false)
        }
      }
    } catch (error) {
      console.error("Erreur lors de la création du luminaire:", error)
    }
  }

  const periods = [...new Set(luminaires.map((l) => l.periode).filter(Boolean))]
  const materials = [...new Set(luminaires.flatMap((l) => l.materiaux || []))]

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 mx-auto mb-4"
              style={{ borderTopColor: "#d4a574" }}
            ></div>
            <p className="text-gray-600">Chargement des luminaires...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2">Luminaires</h1>
          <p className="text-gray-600">{filteredLuminaires.length} luminaires trouvés</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <CSVExportButton data={filteredLuminaires} filename="luminaires" />
          {isAdmin && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="text-white transition-all duration-200"
              style={{ backgroundColor: "#d4a574" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />
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
        <SortSelector value={sortBy} onChange={setSortBy} />
      </div>

      <GalleryGrid items={filteredLuminaires} />

      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />
    </div>
  )
}
