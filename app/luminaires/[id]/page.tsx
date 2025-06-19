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
  const { userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"

  // DÉBUT DE LA MODIFICATION
  useEffect(() => {
    if (!params.id) return;

    async function fetchLuminaireData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/luminaires/${params.id}`);
        if (!response.ok) throw new Error("Luminaire non trouvé via API");
        const result = await response.json();
        
        if (result.success) {
          const formattedLuminaire = {
            ...result.data,
            id: result.data._id,
            image: result.data.images?.[0],
            artist: result.data.designer,
            year: result.data.annee,
            materials: Array.isArray(result.data.materiaux) ? result.data.materiaux.join(', ') : "",
            signed: result.data.signe,
          };
          setLuminaire(formattedLuminaire);

          const allLuminairesResponse = await fetch('/api/luminaires');
          const allLuminairesData = await allLuminairesResponse.json();
          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires);
            setSimilarLuminaires(similar);
          }
        }
      } catch (error) {
        console.error("Erreur chargement du luminaire:", error);
        setLuminaire(null);
      } finally {
        setIsLoading(false);
      }
      
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      setIsFavorite(favorites.includes(params.id as string));
    }

    fetchLuminaireData();
  }, [params.id]);

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.year) || 0;
    return all
      .filter((item) => item._id !== current._id)
      .map((item) => {
        let score = 0;
        if (item.designer && current.artist && getDesignerNameOnly(item.designer) === getDesignerNameOnly(current.artist)) score += 3;
        if (item.specialite && current.specialty && item.specialite === current.specialty) score += 2;
        const itemYear = Number.parseInt(item.annee) || 0;
        if (currentYear > 0 && itemYear > 0 && Math.abs(currentYear - itemYear) <= 10) score += 1;
        return { ...item, id: item._id, image: item.images?.[0], artist: item.designer, year: item.annee, similarityScore: score };
      })
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6);
  };

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return;

    const keyMapping: { [key: string]: string } = { artist: 'designer', year: 'annee', materials: 'materiaux', signed: 'signe' };
    const keyToUpdate = keyMapping[field] || field;
    
    const updatedLocalLuminaire = { ...luminaire, [field]: value };
    setLuminaire(updatedLocalLuminaire);

    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [keyToUpdate]: value })
      });
    } catch (error) { console.error("Erreur de mise à jour:", error); }
  };
  // FIN DE LA MODIFICATION

  // CONSERVÉ : Toutes vos autres fonctions sont identiques
  const getDesignerNameOnly = (str: string = "") => str.split('(')[0].trim();
  const toggleFavorite = () => { /* ... votre code existant ... */ };
  const generatePDF = async () => { /* ... votre code existant ... */ };
  
  if (isLoading || authLoading) { return <div className="text-center py-16">Chargement...</div>; }
  if (!luminaire) { return ( <div className="container-responsive py-8 text-center"><p>Luminaire non trouvé.</p><Link href="/"><Button className="mt-4">Retour</Button></Link></div> ); }

  return (
    // CONSERVÉ : Votre JSX est identique
    <div className="container-responsive py-8">
      {/* ... Votre JSX complet ici ... */}
    </div>
  )
}
