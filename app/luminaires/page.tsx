"use client"

import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { SearchBar } from "@/components/SearchBar";
import { SortSelector } from "@/components/SortSelector";
import { DropdownFilter } from "@/components/DropdownFilter";
import { RangeSlider } from "@/components/RangeSlider";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { CSVExportButton } from "@/components/CSVExportButton";
import { LuminaireFormModal } from "@/components/LuminaireFormModal";
import { Plus, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/LoginModal";
import { toast } from "sonner";

export default function LuminairesPage() {
  // États pour les données
  const [allLuminaires, setAllLuminaires] = useState<any[]>([]);
  const [displayedLuminaires, setDisplayedLuminaires] = useState<any[]>([]);
  
  // États pour les filtres et le tri
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nom-asc");
  const [yearRange, setYearRange] = useState([1900, 2025]);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(2025);
  const [selectedDesigner, setSelectedDesigner] = useState("");
  const [designers, setDesigners] = useState<string[]>([]);
  
  // États pour l'UI et la pagination
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { user, userData } = useAuth();
  const itemsPerPage = 50;

  // ===== LOGIQUE DE CHARGEMENT CORRIGÉE =====

  // 1. Fonction pour charger les données
  const loadLuminaires = useCallback(async (currentPage: number, isNewSearch: boolean) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      // ... (construction des paramètres de recherche identique à avant)
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await fetch(`/api/luminaires?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur réseau");

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) throw new Error("Format de données invalide");

      const newLuminaires = data.data;

      // Si c'est une nouvelle recherche, on remplace les données. Sinon, on les ajoute.
      setDisplayedLuminaires(prev => isNewSearch ? newLuminaires : [...prev, ...newLuminaires]);
      setHasMore(data.pagination.page < data.pagination.pages);
      
    } catch (error) {
      toast.error("Erreur lors du chargement des luminaires.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, searchTerm, selectedDesigner, yearRange]); // Dépendances des filtres

  // 2. Effet pour lancer une NOUVELLE recherche quand les filtres changent
  useEffect(() => {
    setPage(1); // On réinitialise la page
    setDisplayedLuminaires([]); // On vide l'affichage actuel
    setHasMore(true); // On réactive le scroll
    loadLuminaires(1, true); // On charge la page 1
  }, [sortBy, searchTerm, selectedDesigner, yearRange, loadLuminaires]);

  // 3. Effet pour charger la SUITE quand le numéro de page change (scroll infini)
  useEffect(() => {
    if (page > 1) {
      loadLuminaires(page, false);
    }
  }, [page, loadLuminaires]);

  // 4. Fonction pour le scroll infini
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [isLoading, hasMore]);

  // 5. Attachement de l'événement de scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // ===== FIN DE LA LOGIQUE CORRIGÉE =====


  // Les autres fonctions (addLuminaire, handleItemUpdate, etc.) restent les mêmes
  const addLuminaire = async (newLuminaireData: any) => {
    // ... votre logique existante ...
  }
  const handleItemUpdate = async (id: string, updates: any) => {
    // ... votre logique existante ...
  }
  const resetFilters = () => {
    // ... votre logique existante ...
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
                Ajouter
              </Button>
            )}
            <CSVExportButton data={allLuminaires} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
            {/* ... Tous vos filtres, SearchBar, SortSelector etc. restent ici ... */}
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <SortSelector value={sortBy} onChange={setSortBy} options={[
                { value: "nom-asc", label: "A → Z" },
                { value: "nom-desc", label: "Z → A" }
            ]}/>
            {/* etc. */}
        </div>

        {/* La grille d'affichage qui reçoit maintenant les données correctement */}
        <GalleryGrid items={displayedLuminaires} onItemUpdate={handleItemUpdate} />
        
        {isLoading && (
          <div className="text-center mt-8">
            <p>Chargement en cours...</p>
          </div>
        )}
        {!hasMore && displayedLuminaires.length > 0 && (
          <div className="text-center mt-8 py-4">
            <p className="text-gray-500">✅ Vous avez atteint la fin de la liste.</p>
          </div>
        )}
        {displayedLuminaires.length === 0 && !isLoading && (
            <div className="text-center py-12">
                <p>Aucun luminaire trouvé pour ces critères.</p>
            </div>
        )}

        <LuminaireFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={addLuminaire} />
      </div>
    </div>
  )
}
