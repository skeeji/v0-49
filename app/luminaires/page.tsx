"use client";
import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { toast } from "sonner";

export default function LuminairesPage() {
    const [luminaires, setLuminaires] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    const loadLuminaires = useCallback(async (pageNum: number, isNewSearch: boolean) => {
        if (isLoading && !isNewSearch) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: pageNum.toString(), limit: "50" });
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
    }, [isLoading]);

    useEffect(() => {
        loadLuminaires(1, true); // Chargement initial
    }, [loadLuminaires]);

    // Déclencher le chargement des pages suivantes
    const loadMore = useCallback(() => {
      if (!isLoading && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, [isLoading, hasMore]);

    useEffect(() => {
      if (page > 1) {
        loadLuminaires(page, false);
      }
    }, [page, loadLuminaires]);

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

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold mb-8">Galerie des Luminaires</h1>
            <GalleryGrid items={luminaires} />
            {isLoading && page === 1 && <p className="text-center py-10">Chargement initial...</p>}
            {isLoading && page > 1 && <p className="text-center py-4">Chargement de plus d'éléments...</p>}
            {!hasMore && <p className="text-center py-4 text-gray-500">Fin de la liste.</p>}
        </div>
    );
}
