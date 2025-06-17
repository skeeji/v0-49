"use client"

import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { toast } from "sonner";
// Importez vos composants de filtres si nécessaire
// import { SearchBar } from "@/components/SearchBar"; 
// import { SortSelector } from "@/components/SortSelector";

export default function LuminairesPage() {
    const [displayedLuminaires, setDisplayedLuminaires] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    
    const loadLuminaires = useCallback(async (currentPage: number, isNewSearch: boolean) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: currentPage.toString(), limit: "50" });
            const response = await fetch(`/api/luminaires?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur réseau");

            const data = await response.json();
            if (!data.success) throw new Error("Réponse de l'API invalide");

            const newLuminaires = data.data || [];
            setDisplayedLuminaires(prev => isNewSearch ? newLuminaires : [...prev, ...newLuminaires]);
            setHasMore(data.pagination.page < data.pagination.pages);
        } catch (error) {
            toast.error("Erreur de chargement des luminaires.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLuminaires(1, true); // Chargement initial
    }, [loadLuminaires]);
    
    // Logique de scroll infini
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 500 || isLoading || !hasMore) {
                return;
            }
            setPage(prevPage => prevPage + 1);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isLoading, hasMore]);
    
    useEffect(() => {
        if (page > 1) {
            loadLuminaires(page, false);
        }
    }, [page, loadLuminaires]);

    return (
        <div className="container-responsive py-8">
            <h1 className="text-4xl font-playfair text-dark mb-8">Galerie des Luminaires</h1>
            {/* Vous pouvez ajouter vos filtres ici et les passer à `loadLuminaires` si besoin */}
            <GalleryGrid items={displayedLuminaires} />
            {isLoading && <p className="text-center py-4">Chargement...</p>}
            {!hasMore && <p className="text-center py-4 text-gray-500">Vous avez vu tous les luminaires.</p>}
        </div>
    );
}
