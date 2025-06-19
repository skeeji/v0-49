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
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [welcomeVideo, setWelcomeVideo] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchMode, setSearchMode] = useState<"camera" | "upload" | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [canSearchAgain, setCanSearchAgain] = useState(false)
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
      // Charger les luminaires depuis l'API pour la recherche par similarité
      try {
        const res = await fetch('/api/luminaires');
        const data = await res.json();
        if (data.success) {
          console.log(`PAGE D'ACCUEIL: ${data.luminaires.length} luminaires chargés depuis la DB pour la recherche.`);
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

    return () => {
        if (stream) { stream.getTracks().forEach((track) => track.stop()); }
        if (capturedImage && capturedImage.startsWith("blob:")) { URL.revokeObjectURL(capturedImage); }
    }
  }, []); // Exécuté une seule fois
  
  const processApiResults = (apiResults: any[]) => {
    return apiResults.map((result) => {
      const cleanImageId = String(result.image_id || "").split("#")[0];
      
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || "").toLowerCase();
        const searchFilename = cleanImageId.toLowerCase();
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""));
      });

      return {
        imageId: cleanImageId,
        imageUrl: result.image_url || "/placeholder.svg",
        luminaireUrl: localMatch ? `/luminaires/${localMatch._id}` : null, // On utilise _id de la DB
        hasLocalMatch: !!localMatch,
        similarity: result.similarity || 0,
        metadata: result.metadata || {},
      };
    });
  };

  const startCamera = async () => {
    if (window.location.protocol !== 'https:') {
      toast.error("La caméra nécessite une connexion sécurisée (HTTPS).");
      return;
    }
    // ... le reste de la fonction est identique
    try {
        setSearchMode("camera");
        setIsCameraLoading(true);
        cleanupCamera();
        const constraints = { video: { facingMode: { ideal: "environment" } } };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        setIsCameraLoading(false);
        setIsCameraActive(true);
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(console.error);
            }
        }, 100);
    } catch(err: any) {
        toast.error(err.message || "Erreur caméra");
        cleanupCamera();
    }
  };
  // --- FIN DE LA MODIFICATION ---

  const callImageSimilarityAPI = async (file: File) => { /* Votre code existant est conservé */ };
  const removeBackground = async (file: File) => { /* Votre code existant est conservé */ };
  const handleImageSearch = async (file: File) => { /* Votre code existant est conservé */ };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => { /* Votre code existant est conservé */ };
  const cleanupCamera = () => { /* Votre code existant est conservé */ };
  const capturePhoto = async () => { /* Votre code existant est conservé */ };
  const resetSearch = () => { /* Votre code existant est conservé */ };
  const searchAgain = () => { /* Votre code existant est conservé */ };
  const searchWithOriginal = () => { /* Votre code existant est conservé */ };

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
        {/* TOUT VOTRE JSX EXISTANT EST CONSERVÉ ICI... */}
        {/* Le Link dans le map des searchResults utilisera maintenant la logique corrigée */}
        {/* <Link href={result.hasLocalMatch && result.luminaireUrl ? result.luminaireUrl : `/fiche-produit/${result.slug}`}> */}
      </div>
    </div>
  )
}
