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
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye } from "lucide-react"
import { Lightbox } from "@/components/Lightbox"
import { Grid, List } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import { useToast } from "@/hooks/useToast"

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
  const { showToast } = useToast()

  // --- 1. MODIFICATION DE loadLuminaires ---
  const loadLuminaires = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();

        if (searchTerm) params.append("search", searchTerm);
        if (selectedDesigner && selectedDesigner !== "all") params.append("designer", selectedDesigner);
        if (yearRange[0] !== minYear) params.append("anneeMin", yearRange[0].toString());
        if (yearRange[1] !== maxYear) params.append("anneeMax", yearRange[1].toString());
        if (showFavorites) params.append("isFavorite", "true");
        
        const [field, direction] = sortBy.split("-");
        params.append("sortField", field);
        params.append("sortDirection", direction);

        params.append("page", pageToLoad.toString());
        params.append("limit", itemsPerPage.toString());

        const response = await fetch(`/api/luminaires?${params.toString()}`);

        if (response.ok) {
          const data = await response.json();
          // Conservation des adaptations de l'ancienne fonction
          const adaptedLuminaires = data.luminaires.map((l: any) => ({
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
          }));

          return { newLuminaires: adaptedLuminaires, pagination: data.pagination };
        } else {
          console.error("Erreur chargement luminaires:", await response.text());
          showToast("Impossible de charger les luminaires depuis le serveur.", "error");
          return { newLuminaires: [], pagination: null };
        }
      } catch (error) {
        console.error("Erreur réseau chargement luminaires:", error);
        showToast("Une erreur réseau est survenue lors du chargement des données.", "error");
        return { newLuminaires: [], pagination: null };
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, selectedDesigner, yearRange, showFavorites, sortBy, itemsPerPage, minYear, maxYear, showToast]
  );

  // --- 2. REMPLACEMENT DES useEffect DE CHARGEMENT ---
  
  // useEffect pour le chargement initial et le reset des filtres
  useEffect(() => {
    setPage(1); // Reset la page à 1 quand un filtre change
    loadLuminaires(1).then((result) => {
      if (result) {
        setDisplayedLuminaires(result.newLuminaires);
        // Note : Mettre à jour les filtres (designers, années) pourrait se faire ici si nécessaire
        // Exemple : const uniqueDesigners = [...new Set(result.newLuminaires.map((item: any) => item.artist))].filter(Boolean); setDesigners(uniqueDesigners);
        setHasMore(result.pagination ? result.pagination.page < result.pagination.pages : false);
      }
    });
  }, [searchTerm, selectedDesigner, yearRange, showFavorites, sortBy, loadLuminaires]);


  // useEffect pour le chargement des pages suivantes (scroll infini)
  useEffect(() => {
    if (page > 1) {
      loadLuminaires(page).then((result) => {
        if (result && result.newLuminaires.length > 0) {
          setDisplayedLuminaires((prev) => [...prev, ...result.newLuminaires]);
          setHasMore(result.pagination ? result.pagination.page < result.pagination.pages : false);
        } else {
          setHasMore(false);
        }
      });
    }
  }, [page, loadLuminaires]);

  // Charger les favoris depuis localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem("favorites")
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites))
    }
  }, [])

  // Gérer le highlight depuis les paramètres d'URL
  useEffect(() => {
    const highlight = searchParams.get("highlight")
    const period = searchParams.get("period")

    if (highlight) {
      setHighlightedId(highlight)
      setTimeout(() => {
        const element = document.getElementById(`luminaire-${highlight}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("ring-4", "ring-orange", "ring-opacity-50")
          setTimeout(() => {
            element.classList.remove("ring-4", "ring-orange", "ring-opacity-50")
            setHighlightedId(null)
          }, 3000)
        }
      }, 500)
    }

    if (period) {
      setSearchTerm(period)
      setFiltersActive(true)
    }
  }, [searchParams])

  // Vérifier si des filtres sont actifs
  useEffect(() => {
    const isFilterActive =
      searchTerm !== "" ||
      selectedDesigner !== "" ||
      showFavorites ||
      yearRange[0] !== minYear ||
      yearRange[1] !== maxYear

    setFiltersActive(isFilterActive)
  }, [searchTerm, selectedDesigner, showFavorites, yearRange, minYear, maxYear])

  // --- 3. SIMPLIFICATION DE loadMore ET DU SCROLL ---
  
  // Fonction de chargement de plus d'éléments (très simple maintenant)
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setPage((prevPage) => prevPage + 1);
  }, [isLoading, hasMore]);

  // Scroll infini
  useEffect(() => {
    // Conservation de la logique pour le rôle "free"
    if (userData?.role === "free") return;

    const handleScroll = () => {
      // On charge un peu avant d'arriver tout en bas
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore, userData]);

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
        // Recharger la première page pour voir le nouvel ajout
        loadLuminaires(1).then(result => {
            if (result) setDisplayedLuminaires(result.newLuminaires);
        });
        setShowAddModal(false)
        showToast("Luminaire ajouté avec succès", "success")
      } else {
        throw new Error("Erreur lors de l'ajout du luminaire")
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du luminaire:", error)
      showToast("Erreur lors de l'ajout du luminaire", "error")
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
        // Recharger la page actuelle pour voir les changements
        loadLuminaires(page).then(result => {
            if (result) setDisplayedLuminaires(prev => prev.map(item => item.id === id ? {...item, ...updates} : item));
        });
        showToast("Luminaire mis à jour avec succès", "success")
      } else {
        throw new Error("Erreur lors de la mise à jour du luminaire")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du luminaire:", error)
      showToast("Erreur lors de la mise à jour du luminaire", "error")
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setYearRange([minYear, maxYear])
    setSelectedDesigner("")
    setShowFavorites(false)
    setSortBy("nom-asc")
  }

  const toggleFavorite = (id: string) => {
    let updatedFavorites = [...favorites]

    if (favorites.includes(id)) {
      updatedFavorites = favorites.filter((favId) => favId !== id)
    } else {
      updatedFavorites.push(id)
    }

    setFavorites(updatedFavorites)
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites))
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <h1 className="text-4xl font-playfair text-dark mb-4 lg:mb-0">Luminaires ({displayedLuminaires.length})</h1>

          <div className="flex items-center gap-4">
            {userData?.role === "admin" && (
              <Button onClick={() => setShowAddModal(true)} className="bg-orange hover:bg-orange/90">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un luminaire
              </Button>
            )}

            {userData?.role === "admin" && <CSVExportButton data={allLuminaires} />}

            <FavoriteToggleButton isActive={showFavorites} onClick={() => setShowFavorites(!showFavorites)} />
          </div>
        </div>

        {/* Message pour les utilisateurs "free" */}
        {userData?.role === "free" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Vous utilisez un compte gratuit. Seuls les premiers luminaires sont affichés.
                <Link href="#" className="ml-1 underline font-medium">
                  Passez à Premium
                </Link>{" "}
                pour voir tous les résultats.
              </span>
            </p>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Filtres et tri</h3>
            {filtersActive && (
              <Button onClick={resetFilters} variant="outline" size="sm">
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

            <SortSelector
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "nom-asc", label: "A → Z" },
                { value: "nom-desc", label: "Z → A" },
                { value: "annee-desc", label: "Année ↓" },
                { value: "annee-asc", label: "Année ↑" },
              ]}
            />

            <DropdownFilter
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designers.map((designer) => ({ value: designer, label: designer }))}
              placeholder="Tous les designers"
            />

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <RangeSlider min={minYear} max={maxYear} value={yearRange} onChange={setYearRange} label="Période" />

          {filtersActive && (
            <div className="mt-4 p-2 bg-orange/10 rounded-lg text-sm text-orange">
              ⚠️ Filtres actifs - {displayedLuminaires.length} luminaires affichés
              {userData?.role === "free" && <span className="ml-2">(limité)</span>}
            </div>
          )}
        </div>

        {/* Affichage des luminaires selon le mode */}
        {viewMode === "grid" ? (
          <GalleryGrid items={displayedLuminaires} viewMode={viewMode} onItemUpdate={handleItemUpdate} columns={8} />
        ) : (
          <div className="space-y-2">
            {displayedLuminaires.map((item: any) => (
              <div key={item.id} id={`luminaire-${item.id}`} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-4">
                  <Link
                    href={`/luminaires/${item.id}`}
                    className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <Image
                      src={item.image || "/placeholder.svg?height=100&width=100"}
                      alt={item.name || "Luminaire"}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/luminaires/${item.id}`}>
                      <h3 className="text-base font-playfair text-dark hover:text-orange cursor-pointer truncate">
                        {item.name || "Nom du luminaire"}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 truncate">{item.artist || "Artiste non renseigné"}</p>
                    <p className="text-xs text-gray-500">{item.year || "Année inconnue"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <FavoriteToggleButton
                      isActive={favorites.includes(item.id)}
                      onClick={() => toggleFavorite(item.id)}
                    />
                    <Button
                      onClick={() => setLightboxImage(item.image)}
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
          </div>
        )}

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-orange/10 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange mr-2"></div>
              <span className="text-orange">Chargement...</span>
            </div>
          </div>
        )}

        {/* Message fin de liste */}
        {!hasMore && displayedLuminaires.length > 0 && (
          <div className="text-center mt-8 py-4">
            <p className="text-gray-500">
              {userData?.role === "free" ? (
                <>
                  ⚠️ Affichage limité à {displayedLuminaires.length} luminaires
                  <Link href="#" className="ml-1 text-orange hover:underline">
                    Passez à Premium
                  </Link>{" "}
                  pour voir tous les luminaires.
                </>
              ) : (
                <>✅ Tous les luminaires ont été chargés ({displayedLuminaires.length} au total)</>
              )}
            </p>
          </div>
        )}

        {/* Message aucun résultat */}
        {displayedLuminaires.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun luminaire trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
            <Button onClick={resetFilters} className="mt-4 bg-orange">
              Réinitialiser les filtres
            </Button>
          </div>
        )}

        {/* Modal d'ajout */}
        <LuminaireFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={addLuminaire} />

        {/* Modal de connexion */}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    </div>
  )
}
