// Fichier : app/luminaires/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"

export default function LuminaireDetailPage() {
  const params = useParams()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [similarLuminaires, setSimilarLuminaires] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // CORRECTION : On récupère aussi l'état de chargement de l'authentification
  const { user, userData, loading: authLoading } = useAuth()

  // CORRECTION : On vérifie les droits d'édition SEULEMENT si l'authentification est terminée
  const canEdit = !authLoading && userData?.role === "admin"

  useEffect(() => {
    if (!params.id) return;

    // Cette fonction reste la même, elle va chercher les données
    async function fetchLuminaireData() {
      // ... (le code de fetch que je vous ai donné précédemment) ...
    }

    fetchLuminaireData();
  }, [params.id]);
  
  // Le reste de vos fonctions (findSimilarLuminaires, handleUpdate, toggleFavorite, generatePDF) reste ici...

  // CORRECTION : On affiche un chargement tant que les données OU l'authentification ne sont pas prêtes
  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
          <p>Chargement...</p>
      </div>
    );
  }

  if (!luminaire) {
    return (
      <div className="container-responsive py-8 text-center">
        <p className="text-lg text-gray-600">Luminaire non trouvé.</p>
        <Link href="/"><Button className="mt-4">Retour à l'accueil</Button></Link>
      </div>
    );
  }

  return (
    // Votre JSX complet ici, il fonctionnera maintenant avec les bons droits d'édition
    <div className="container-responsive py-8">
       {/* ... Votre JSX ... */}
    </div>
  )
}
