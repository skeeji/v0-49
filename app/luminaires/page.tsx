"use client";
import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { toast } from "sonner";
// Importez vos composants de filtres
import { SearchBar } from "@/components/SearchBar";
import { SortSelector } from "@/components/SortSelector";

export default function LuminairesPage() {
    const [luminaires, setLuminaires] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("nom-asc");
    
    const loadLuminaires = useCallback(async (pageNum: number, isNewSearch: boolean) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: "50",
                sortBy,
                searchTerm
            });
            const response = await fetch(`/api/luminaires?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur réseau");

            const data = await response.json();
            if (!data.success) throw new Error("Réponse API invalide");

            const newLuminaires = data.data || [];
            setLuminaires(prev => isNewSearch ? newLuminaires : [...prev, ...newLuminaires]);
            setHasMore(data.pagination.page < data.pagination.pages);
        } catch (error) {
            toast.error("Erreur de chargement des luminaires.");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, sortBy, searchTerm]); // Dépendances de filtres

    // Déclencher une nouvelle recherche quand les filtres changent
    useEffect(() => {
        setPage(1);
        loadLuminaires(1, true);
    }, [sortBy, searchTerm, loadLuminaires]);

    // Charger les pages suivantes quand le state 'page' change
    useEffect(() => {
        if (page > 1) {
            loadLuminaires(page, false);
        }
    }, [page, loadLuminaires]);
    
    // Logique de scroll pour déclencher le changement de page
    const handleScroll = useCallback(() => {
        if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 500 || isLoading || !hasMore) {
            return;
        }
        setPage(prevPage => prevPage + 1);
    }, [isLoading, hasMore]);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold mb-8">Galerie des Luminaires</h1>
            {/* Ici vos filtres qui modifient les états searchTerm et sortBy */}
            <GalleryGrid items={luminaires} />
            {isLoading && <p className="text-center py-4">Chargement...</p>}
            {!hasMore && <p className="text-center py-4 text-gray-500">Fin de la liste.</p>}
        </div>
    );
}
