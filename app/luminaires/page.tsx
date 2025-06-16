"use client"
import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
// ... autres imports ...
import { toast } from "sonner";

export default function LuminairesPage() {
    const [displayedLuminaires, setDisplayedLuminaires] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    // ... autres états ...

    const loadLuminaires = useCallback(async (isNewSearch: boolean) => {
        if (isLoading) return;
        setIsLoading(true);
        const currentPage = isNewSearch ? 1 : page;

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                // ... ajoutez ici vos autres filtres (sortBy, searchTerm, etc)
            });

            const response = await fetch(`/api/luminaires?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur réseau");

            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) throw new Error("Format de données invalide");

            const newLuminaires = data.data;

            if (isNewSearch) {
                setDisplayedLuminaires(newLuminaires);
            } else {
                setDisplayedLuminaires(prev => [...prev, ...newLuminaires]);
            }
            
            setHasMore(data.pagination.page < data.pagination.pages);
        } catch (error) {
            toast.error("Erreur lors du chargement des luminaires.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, page /* ... autres dépendances de filtres ... */]);

    // Déclencher le chargement initial et lors des changements de filtres
    useEffect(() => {
        loadLuminaires(true);
    }, [/* dépendances des filtres comme sortBy, searchTerm... */]);

    // Déclencher le chargement des pages suivantes
    useEffect(() => {
        if (page > 1) {
            loadLuminaires(false);
        }
    }, [page, loadLuminaires]);
    
    // Logique pour le scroll infini
    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            setPage(prevPage => prevPage + 1);
        }
    }, [isLoading, hasMore]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
                loadMore();
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [loadMore]);


    return (
        <div className="container-responsive py-8">
            <h1 className="text-4xl font-playfair text-dark mb-8">Luminaires ({displayedLuminaires.length})</h1>
            {/* ... Vos filtres ... */}
            
            <GalleryGrid items={displayedLuminaires} />

            {isLoading && <p>Chargement...</p>}
            {!hasMore && <p>Vous avez atteint la fin de la liste.</p>}
        </div>
    );
}
