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
import { Plus, Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import { toast } from "sonner"
import Link from "next/link"

export default function LuminairesPage() {
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [displayedLuminaires, setDisplayedLuminaires] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom-asc")
  const [yearRange, setYearRange] = useState([1900, 2025])
  const [minYear, setMinYear] = useState(1900)
  const [maxYear, setMaxYear] = useState(2025)
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  const [page, setPage] = useState(1)
  const [designers, setDesigners] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  
  // States pour les modals et autres UI
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const { user, userData } = useAuth()
  const searchParams = useSearchParams()
  const itemsPerPage = 50

  const loadLuminaires = useCallback(
    async (isNewSearch: boolean) => {
      if (isLoading) return;
      setIsLoading(true);
      
      const currentPage = isNewSearch ? 1 : page;

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (selectedDesigner) params.append("designer", selectedDesigner);
        // Ajoutez d'autres filtres si nécessaire

        const [sortField, sortDirection] = sortBy.split("-");
        params.append("sortField", sortField);
        params.append("sortDirection", sortDirection);
        
        params.append("page", currentPage.toString());
        params.append("limit", itemsPerPage.toString());

        const response = await fetch(`/api/luminaires?${params.toString()}`);
        if (!response.ok) throw new Error("La réponse du réseau n'était pas OK");
        
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error("Format de données invalide");

        const newLuminaires = data.data;

        if (isNewSearch) {
          setDisplayedLuminaires(newLuminaires);
          setAllLuminaires(newLuminaires); // Mettre à jour la liste complète pour l'export CSV
        } else {
          setDisplayedLuminaires(prev => [...prev, ...newLuminaires]);
          setAllLuminaires(prev => [...prev, ...newLuminaires]);
        }
        
        setHasMore(data.pagination.page < data.pagination.pages);
        console.log(`📊 ${newLuminaires.length} luminaires chargés. Page ${currentPage}/${data.pagination.pages}.`);
      } catch (error) {
        console.error("Erreur lors du chargement des luminaires:", error);
        toast.error("Une erreur est survenue lors du chargement.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, page, searchTerm, selectedDesigner, sortBy, yearRange, minYear, maxYear, showFavorites]
  );
  
  // Effet pour la recherche initiale et les changements de filtres
  useEffect(() => {
    setPage(1); // Réinitialise la page à 1 à chaque nouveau filtre
    loadLuminaires(true); // Lance une nouvelle recherche
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedDesigner, sortBy, showFavorites, yearRange]);

  // Effet pour charger plus de contenu (scroll infini)
  useEffect(() => {
    if (page > 1) {
      loadLuminaires(false); // Charge la page suivante
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setPage(prevPage => prevPage + 1);
  }, [isLoading, hasMore]);

  // Gestionnaire de scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // Le reste de vos fonctions (addLuminaire, handleItemUpdate, etc.) est OK.
  // ...

  return (
    <div className="container-responsive py-8">
      {/* ... Votre JSX reste identique, il utilisera maintenant `displayedLuminaires` qui est correctement mis à jour. */}
      {/* Assurez-vous que <GalleryGrid /> est prêt à recevoir les données */}
      <GalleryGrid items={displayedLuminaires} onItemUpdate={() => {}} />
      {/* ... */}
    </div>
  )
}
