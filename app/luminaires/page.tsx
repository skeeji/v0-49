"use client"

import { useState, useEffect, useCallback } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { CSVExportButton } from "@/components/CSVExportButton"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { Plus, Grid, List, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Lightbox } from "@/components/Lightbox"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import { toast } from "sonner" // CORRECTION 1: Import du bon système de toast

export default function LuminairesPage() {
  const [allLuminaires, setAllLuminaires] = useState([])
  const [filteredLuminaires, setFilteredLuminaires] = useState([])
  const [displayedLuminaires, setDisplayedLuminaires] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom-asc")
  const [yearRange, setYearRange] = useState([1900, 2025])
  const [minYear, setMinYear] = useState(1900)
  const [maxYear, setMaxYear] = useState(2025)
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFavorites, setShowFavorites] = useState(false)
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [designers, setDesigners] = useState<string[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filtersActive, setFiltersActive] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const searchParams = useSearchParams()
  const itemsPerPage = 50
  const [favorites, setFavorites] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const { user, userData } = useAuth()
  // CORRECTION 2: Ligne 'useToast' supprimée

  const loadLuminaires = useCallback(
    async (resetPage = false) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchTerm) params.append("search", searchTerm)
        if (selectedDesigner && selectedDesigner !== "all") params.append("designer", selectedDesigner)
        if (yearRange[0] !== minYear) params.append("anneeMin", yearRange[0].toString())
        if (yearRange[1] !== maxYear) params.append("anneeMax", yearRange[1].toString())
        if (showFavorites) params.append("isFavorite", "true")

        const [field, direction] = sortBy.split("-")
        params.append("sortField", field === "name" ? "nom" : field === "year" ? "annee" : field)
        params.append("sortDirection", direction)

        const currentPage = resetPage ? 1 : page
        params.append("page", currentPage.toString())
        params.append("limit", itemsPerPage.toString())

        const response = await fetch(`/api/luminaires?${params.toString()}`)

        if (response.ok) {
          const data = await response.json()

          // CORRECTION 3: Utiliser `data.data` au lieu de `data.luminaires`
          if (!data.data || !Array.isArray(data.data)) {
            throw new Error("Format de données invalide reçu de l'API");
          }

          const adaptedLuminaires = data.data.map((l: any) => ({
            id: l._id,
            name: l.nom,
            artist: l.designer,
            year: l.annee?.toString() || "",
            specialty: l.specialite || "",
            collaboration: l.collaboration || "",
            signed: l.signe || "",
            image: l.images?.[0] || "",
            filename: l.filename || "",
            dimensions: l.dimensions || "",
            estimation: l.estimation || "",
            materials: Array.isArray(l.materiaux) ? l.materiaux.join(", ") : l.materiaux || "",
            description: l.description || "",
          }))

          if (resetPage || currentPage === 1) {
            setAllLuminaires(adaptedLuminaires)
            setFilteredLuminaires(adaptedLuminaires)
            setDisplayedLuminaires(adaptedLuminaires)
          } else {
            setDisplayedLuminaires((prev) => [...prev, ...adaptedLuminaires])
          }
          
          // La pagination peut venir de `data.pagination` ou être déduite
          setHasMore(data.pagination ? data.pagination.page < data.pagination.pages : adaptedLuminaires.length === itemsPerPage)

          const uniqueDesigners = [...new Set(adaptedLuminaires.map((item: any) => item.artist))].filter(Boolean) as string[]
          setDesigners(uniqueDesigners)

          const years = adaptedLuminaires.map((item: any) => Number.parseInt(item.year)).filter((year) => !isNaN(year) && year > 0)
          if (years.length > 0) {
            const min = Math.max(1000, Math.min(...years))
            const max = Math.min(2025, Math.max(...years))
            setMinYear(min)
            setMaxYear(max)
            if (resetPage) {
              setYearRange([min, max])
            }
          }
          console.log(`📊 ${adaptedLuminaires.length} luminaires chargés depuis MongoDB`)
        } else {
          const errorText = await response.text()
          console.error("Erreur lors du chargement des luminaires:", errorText)
          toast.error("Erreur lors du chargement des données.")
        }
      } catch (error) {
        console.error("Erreur lors du chargement des luminaires:", error)
        toast.error("Une erreur s'est produite. Impossible de charger les données.")
      } finally {
        setIsLoading(false)
      }
    },
    [searchTerm, selectedDesigner, yearRange, showFavorites, sortBy, page, itemsPerPage, minYear, maxYear],
  )

  useEffect(() => {
    loadLuminaires(true)
    setPage(1)
  }, [searchTerm, selectedDesigner, yearRange, showFavorites, sortBy, loadLuminaires])

  // ... (le reste de vos useEffect reste inchangé)

  const addLuminaire = async (newLuminaire: any) => {
    if (userData?.role !== "admin") {
      setShowLoginModal(true)
      return
    }
    try {
      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: newLuminaire.name,
          designer: newLuminaire.artist,
          annee: Number.parseInt(newLuminaire.year) || new Date().getFullYear(),
          specialite: newLuminaire.specialty,
          collaboration: newLuminaire.collaboration,
          signe: newLuminaire.signed,
          dimensions: newLuminaire.dimensions,
          estimation: newLuminaire.estimation,
          materiaux: newLuminaire.materials ? newLuminaire.materials.split(",").map((m: string) => m.trim()) : [],
          description: newLuminaire.description || "",
          periode: newLuminaire.specialty || "",
          couleurs: [],
          images: [],
        }),
      })

      if (response.ok) {
        loadLuminaires(true)
        setShowAddModal(false)
        toast.success("Luminaire ajouté avec succès") // CORRECTION
      } else {
        throw new Error("Erreur lors de l'ajout du luminaire")
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du luminaire:", error)
      toast.error("Erreur lors de l'ajout du luminaire") // CORRECTION
    }
  }

  const handleItemUpdate = async (id: string, updates: any) => {
    if (userData?.role !== "admin") return
    try {
      const response = await fetch(`/api/luminaires/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: updates.name,
          designer: updates.artist,
          annee: Number.parseInt(updates.year) || new Date().getFullYear(),
          specialite: updates.specialty,
          collaboration: updates.collaboration,
          signe: updates.signed,
          dimensions: updates.dimensions,
          estimation: updates.estimation,
          materiaux: updates.materials ? updates.materials.split(",").map((m: string) => m.trim()) : [],
          description: updates.description || "",
        }),
      })

      if (response.ok) {
        loadLuminaires(true)
        toast.success("Luminaire mis à jour avec succès") // CORRECTION
      } else {
        throw new Error("Erreur lors de la mise à jour du luminaire")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du luminaire:", error)
      toast.error("Erreur lors de la mise à jour du luminaire") // CORRECTION
    }
  }

  // ... (toutes vos autres fonctions comme resetFilters, toggleFavorite, etc. restent inchangées)
  // ... (votre JSX dans le return reste inchangé)
  
  // Le reste du fichier (useEffect, autres fonctions, et le return avec le JSX) reste identique.
  // J'omets le reste pour la lisibilité, mais vous devez garder tout votre JSX.
  return (
     <div className="container-responsive py-8">
       {/* ... tout votre JSX reste ici ... */}
     </div>
   )
}
