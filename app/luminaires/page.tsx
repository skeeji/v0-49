"use client"
import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { toast } from "sonner";

export default function LuminairesPage() {
    const [displayedLuminaires, setDisplayedLuminaires] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    // Ajoutez ici d'autres états pour les filtres si nécessaire, ex:
    // const [sortBy, setSortBy] = useState("nom-asc");

    const loadLuminaires = useCallback(async (isNewSearch: boolean) => {
        if (isLoading) return;
        setIsLoading(true);
        const currentPage = isNewSearch ? 1 : page;

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                // sortBy, etc.
            });
            
            const response = await fetch(`/api/luminaires?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur réseau");

            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) throw new Error("Format de données invalide");

            const newLuminaires = data.data;

            setDisplayedLuminaires(prev => isNewSearch ? newLuminaires : [...prev, ...newLuminaires]);
            setHasMore(data.pagination.page < data.pagination.pages);
        } catch (error) {
            toast.error("Erreur de chargement.");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, page /*, sortBy, ...autres filtres */ ]);

    useEffect(() => {
        loadLuminaires(true);
    }, [/* sortBy, ...autres filtres */]);

    useEffect(() => {
        if (page > 1) {
            loadLuminaires(false);
        }
    }, [page, loadLuminaires]);
    
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
        <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold mb-8">Galerie des Luminaires</h1>
            <GalleryGrid items={displayedLuminaires} />
            {isLoading && <p className="text-center mt-4">Chargement...</p>}
            {!hasMore && <p className="text-center mt-4 text-gray-500">Fin de la liste.</p>}
        </div>
    );
}
