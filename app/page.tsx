"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  // Tous vos useState restent ici...
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [welcomeVideo, setWelcomeVideo] = useState("")
  // ... etc.

  const { user, userData, incrementSearchCount, canSearch } = useAuth()
  // ... tous vos useRef ...
  
  useEffect(() => {
    async function fetchInitialData() {
      // Charger les luminaires depuis l'API
      try {
        const res = await fetch('/api/luminaires');
        const data = await res.json();
        if (data.success) {
          setLuminaires(data.luminaires);
        }
      } catch (e) { console.error("Erreur chargement luminaires", e); }

      // Charger la vidéo d'accueil depuis l'API
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings?.welcomeVideoId) {
          setWelcomeVideo(`/api/video/${data.settings.welcomeVideoId}`);
        }
      } catch (e) { console.error("Erreur chargement vidéo", e); }
    }
    fetchInitialData();
  }, [])

  const callImageSimilarityAPI = async (file: File) => { /* Votre code existant est parfait */ };

  // CORRECTION FINALE : S'assurer que le lien utilise le bon identifiant
  const processApiResults = (apiResults: any[]) => {
    return apiResults.map((result) => {
      const cleanImageId = String(result.image_id || "").split("#")[0];
      const finalImageUrl = result.image_url || "/placeholder.svg";
      
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || "").toLowerCase();
        const searchFilename = cleanImageId.toLowerCase();
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""));
      });

      return {
        imageId: cleanImageId,
        imageUrl: finalImageUrl,
        // CORRECTION : On utilise `localMatch._id` qui vient de la base de données
        luminaireUrl: localMatch ? `/luminaires/${localMatch._id}` : null,
        hasLocalMatch: !!localMatch,
        similarity: result.similarity || 0,
      };
    });
  };

  const removeBackground = async (file: File) => { /* Votre code existant est parfait */ };
  const handleImageSearch = async (file: File) => { /* Votre code existant est parfait */ };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => { /* Votre code existant est parfait */ };
  const cleanupCamera = () => { /* Votre code existant est parfait */ };
  
  const startCamera = async () => {
    if (window.location.protocol !== 'https:') {
        toast.error("La caméra nécessite une connexion sécurisée (HTTPS).");
        return;
    }
    // ... le reste de votre fonction startCamera
  };

  const capturePhoto = async () => { /* Votre code existant est parfait */ };
  const resetSearch = () => { /* Votre code existant est parfait */ };
  const searchAgain = () => { /* Votre code existant est parfait */ };
  const searchWithOriginal = () => { /* Votre code existant est parfait */ };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ... Votre JSX complet est parfait, y compris le lien qui utilise maintenant `result.luminaireUrl` */}
    </div>
  );
}
