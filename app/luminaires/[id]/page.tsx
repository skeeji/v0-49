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
  const { userData } = useAuth()
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    if (!params.id) return;

    async function fetchLuminaireData() {
      setIsLoading(true);
      try {
        // CORRECTION: On charge le luminaire depuis l'API
        const response = await fetch(`/api/luminaires/${params.id}`);
        if (!response.ok) throw new Error("Luminaire non trouvé via API");
        const result = await response.json();
        
        if (result.success) {
          // CORRECTION: On adapte les noms des champs pour correspondre à TOUT le reste du composant
          const formattedLuminaire = {
            ...result.data,
            id: result.data._id,
            year: result.data.annee,
            artist: result.data.designer,
            image: result.data.images?.[0] || null,
            materials: Array.isArray(result.data.materiaux) ? result.data.materiaux.join(', ') : "",
            signed: result.data.signe,
          };
          setLuminaire(formattedLuminaire);
          
          // CORRECTION: On va chercher TOUS les luminaires pour trouver les similaires
          const allLuminairesResponse = await fetch('/api/luminaires');
          const allLuminairesData = await allLuminairesResponse.json();
          if (allLuminairesData.success) {
              const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires);
              setSimilarLuminaires(similar);
          }
        } else {
            setLuminaire(null);
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

  const findSimilarLuminaires = (currentLuminaire: any, allLuminaires: any[]) => {
    const currentYear = Number.parseInt(currentLuminaire.annee) || 0;
    return allLuminaires
      .filter((item) => item._id !== currentLuminaire._id)
      .map((item) => {
        let score = 0;
        if (item.designer && currentLuminaire.designer && item.designer.toLowerCase() === currentLuminaire.designer.toLowerCase()) score += 3;
        if (item.specialite && currentLuminaire.specialite && item.specialite.toLowerCase() === currentLuminaire.specialite.toLowerCase()) score += 2;
        const itemYear = Number.parseInt(item.annee) || 0;
        if (currentYear > 0 && itemYear > 0 && Math.abs(currentYear - itemYear) <= 10) score += 1;
        return { 
            ...item, 
            id: item._id, 
            image: item.images?.[0], 
            year: item.annee,
            artist: item.designer,
            similarityScore: score 
        };
      })
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6);
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return;
    const keyToUpdate = field === 'year' ? 'annee' : field === 'artist' ? 'designer' : field;
    const updatedLuminaire = { ...luminaire, [field]: value };
    setLuminaire(updatedLuminaire);
    
    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [keyToUpdate]: value })
      });
    } catch (error) { console.error("Erreur de mise à jour:", error); }
  }

  const toggleFavorite = () => {
    if (!luminaire) return;
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const newFavorites = isFavorite ? favorites.filter((id: string) => id !== luminaire._id) : [...favorites, luminaire._id];
    localStorage.setItem("favorites", JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const generatePDF = async () => { /* Votre fonction PDF existante ici */ };

  if (isLoading) {
    return ( <div className="text-center py-8"><p>Chargement du luminaire...</p></div> );
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
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <Link href="/"><Button variant="outline" className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Retour</Button></Link>
            <div className="flex items-center gap-4">
                {(userData?.role === "admin" || userData?.role === "premium") && ( <Button onClick={generatePDF} className="bg-orange hover:bg-orange/90 text-white" disabled={generatingPDF}><Download className="w-4 h-4 mr-2" />{generatingPDF ? "Génération..." : "Télécharger PDF"}</Button> )}
                <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
            </div>
        </div>
        {!canEdit && ( <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800"><p className="flex items-center"><span className="mr-2">ℹ️</span><span>Mode lecture seule. {userData?.role === "free" && (<Link href="#" className="ml-1 underline font-medium">Passez à Premium</Link>)}</span></p></div> )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
                <Image src={luminaire.image || "/placeholder.svg?height=600&width=600"} alt={luminaire.name || "Luminaire"} fill className="object-cover" />
            </div>
            <div className="aspect-square overflow-y-auto pr-2">
                <div className="space-y-4 font-serif">
                    <div><EditableField value={luminaire.name || ""} onSave={(value) => handleUpdate("name", value)} className="text-2xl font-playfair text-dark" placeholder="Nom du luminaire" disabled={!canEdit} /></div>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label><EditableField value={luminaire.artist || ""} onSave={(value) => handleUpdate("artist", value)} placeholder="Nom de l'artiste" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label><EditableField value={luminaire.specialty || ""} onSave={(value) => handleUpdate("specialty", value)} placeholder="Spécialité" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label><EditableField value={luminaire.collaboration || ""} onSave={(value) => handleUpdate("collaboration", value)} placeholder="Collaboration" multiline disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Description</label><EditableField value={luminaire.description || ""} onSave={(value) => handleUpdate("description", value)} placeholder="Description" multiline disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Année</label><EditableField value={luminaire.year || ""} onSave={(value) => handleUpdate("year", value)} placeholder="Année" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label><EditableField value={luminaire.dimensions || ""} onSave={(value) => handleUpdate("dimensions", value)} placeholder="Dimensions" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label><EditableField value={luminaire.materials || ""} onSave={(value) => handleUpdate("materials", value)} placeholder="Matériaux" multiline disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Signé</label><EditableField value={luminaire.signed || ""} onSave={(value) => handleUpdate("signed", value)} placeholder="Signature" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label><EditableField value={luminaire.estimation || ""} onSave={(value) => handleUpdate("estimation", value)} placeholder="Estimation" disabled={!canEdit}/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Lien internet</label><div className="flex items-center gap-2"><EditableField value={luminaire.url || ""} onSave={(value) => handleUpdate("url", value)} placeholder="https://exemple.com" disabled={!canEdit}/>{luminaire.url && (<a href={luminaire.url} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange/80"><ExternalLink className="w-4 h-4" /></a>)}</div></div>
                    </div>
                </div>
            </div>
        </div>
        {similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarLuminaires.map((similar: any) => (
                <Link key={similar.id} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="aspect-square relative bg-gray-100"><Image src={similar.image || "/placeholder.svg"} alt={similar.name || "Luminaire"} fill className="object-cover group-hover:scale-105 transition-transform"/></div>
                    <div className="p-4 space-y-2"><h3 className="font-playfair text-lg text-dark truncate">{similar.name || "Nom"}</h3><p className="text-gray-600 text-sm">{similar.artist || "Artiste"}</p><p className="text-gray-500 text-xs">{similar.year || "Année"}</p></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
