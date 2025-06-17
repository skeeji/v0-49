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
        if (isLoading) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: pageNum.toString(), limit: "50" });
            const response = await fetch(`/api/luminaires?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur réseau");

            const data = await response.json();
            if (!data.success) throw new Error("Réponse de l'API invalide");

            const newLuminaires = data.data || [];
            setLuminaires(prev => isNewSearch ? newLuminaires : [...prev, ...newLuminaires]);
            setHasMore(data.pagination.page < data.pagination.pages);
        } catch (error) {
            toast.error("Erreur de chargement des luminaires.");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    // Chargement initial
    useEffect(() => {
        loadLuminaires(1, true);
    }, [loadLuminaires]);

    // Scroll infini
    const handleScroll = useCallback(() => {
        if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 500 || isLoading || !hasMore) {
            return;
        }
        setPage(prevPage => prevPage + 1);
    }, [isLoading, hasMore]);

    useEffect(() => {
        if (page > 1) {
            loadLuminaires(page, false);
        }
    }, [page, loadLuminaires]);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold mb-8">Galerie ({luminaires.length} affichés)</h1>
            <GalleryGrid items={luminaires} />
            {isLoading && <p className="text-center py-4">Chargement...</p>}
            {!hasMore && luminaires.length > 0 && <p className="text-center py-4 text-gray-500">Fin de la liste.</p>}
        </div>
    );
}
