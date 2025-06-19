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
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [luminaires, setLuminaires] = useState<any[]>([]) // Données live
  const [welcomeVideo, setWelcomeVideo] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchMode, setSearchMode] = useState<"camera" | "upload" | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null)
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false)
  const [selectedImageForSearch, setSelectedImageForSearch] = useState<File | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { user, userData, incrementSearchCount, canSearch } = useAuth()
  
  // --- DÉBUT DE LA MODIFICATION ---
  useEffect(() => {
    async function fetchInitialData() {
      // Charger les luminaires depuis l'API
      try {
        const res = await fetch('/api/luminaires');
        const data = await res.json();
        if (data.success) {
          console.log(`PAGE D'ACCUEIL: ${data.luminaires.length} luminaires chargés depuis la DB.`);
          setLuminaires(data.luminaires);
        }
      } catch (e) { console.error("Erreur chargement luminaires pour la recherche", e); }

      // Charger la vidéo d'accueil depuis l'API
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings?.welcomeVideoId) {
          setWelcomeVideo(`/api/video/${data.settings.welcomeVideoId}`);
        }
      } catch (e) { console.error("Erreur chargement vidéo d'accueil", e); }
    }
    fetchInitialData();
  }, []);

  const processApiResults = (apiResults: any[]) => {
    return apiResults.map((result) => {
      const cleanImageId = String(result.image_id || "").split("#")[0];
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || "").toLowerCase();
        const searchFilename = cleanImageId.toLowerCase();
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""));
      });
      const slug = cleanImageId.replace(/\.[^/.]+$/, "");
      return {
        imageId: cleanImageId,
        slug: slug,
        imageUrl: result.image_url || "/placeholder.svg",
        ficheUrl: `/luminaires/${slug}`, // Lien générique
        luminaireUrl: localMatch ? `/luminaires/${localMatch._id}` : null, // Lien spécifique si trouvé
        hasLocalMatch: !!localMatch,
        similarity: result.similarity || 0,
      };
    });
  };
  
  const startCamera = async () => {
    // CORRECTION : On vérifie que l'on est bien en HTTPS
    if (window.location.protocol !== 'https:') {
      toast.error("La caméra nécessite une connexion sécurisée (HTTPS).");
      return;
    }
    // ... le reste de votre fonction startCamera
  };
  // --- FIN DE LA MODIFICATION ---

  // ... (Toutes vos autres fonctions comme callImageSimilarityAPI, removeBackground, etc. restent ici SANS CHANGEMENT)

  return (
    <div className="relative min-h-screen overflow-hidden">
      {welcomeVideo ? (
        <video key={welcomeVideo} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover">
          <source src={welcomeVideo} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-orange to-gold" />
      )}
      <div className="absolute inset-0 bg-orange opacity-60" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen container-responsive">
          {/* ... TOUT VOTRE JSX EXISTANT VA ICI, SANS AUCUN CHANGEMENT ... */}
          {/* Le lien dans les résultats de recherche utilisera maintenant la logique corrigée */}
          {/* <Link href={result.hasLocalMatch ? result.luminaireUrl : result.ficheUrl}> */}
      </div>
    </div>
  );
}
