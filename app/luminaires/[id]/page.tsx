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

  useEffect(() => {
    if (!params.id) return;
    async function fetchLuminaireData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/luminaires/${params.id}`);
        if (!response.ok) throw new Error("Luminaire non trouvé");
        const result = await response.json();
        
        if (result.success) {
          const formattedLuminaire = {
            ...result.data,
            id: result.data._id,
            image: result.data.images?.[0] || null,
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
      } catch (error) { console.error("Erreur chargement:", error); setLuminaire(null); } 
      finally { setIsLoading(false); }

      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      setIsFavorite(favorites.includes(params.id as string));
    }
    fetchLuminaireData();
  }, [params.id]);

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.annee) || 0;
    return all
      .filter((item) => item._id !== current._id)
      .map((item) => {
        let score = 0;
        if (item.designer && current.designer && item.designer === current.designer) score += 3;
        if (item.specialite && current.specialite && item.specialite === current.specialite) score += 2;
        const itemYear = Number.parseInt(item.annee) || 0;
        if (currentYear > 0 && itemYear > 0 && Math.abs(currentYear - itemYear) <= 10) score += 1;
        return { ...item, id: item._id, image: item.images?.[0], artist: item.designer, year: item.annee, similarityScore: score };
      })
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6);
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return;
    const keyMapping: { [key: string]: string } = { artist: 'designer', year: 'annee', materials: 'materiaux', signed: 'signe' };
    const keyToUpdate = keyMapping[field] || field;

    setLuminaire((prev: any) => ({ ...prev, [field]: value }));
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

  if (isLoading || authLoading) { return ( <div className="text-center py-16"><p>Chargement...</p></div> ); }
  if (!luminaire) { return ( <div className="container-responsive py-8 text-center"><p>Luminaire non trouvé.</p><Link href="/"><Button className="mt-4">Retour</Button></Link></div> ); }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/"><Button variant="outline" className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Retour</Button></Link>
          <div className="flex items-center gap-4">
            {(userData?.role === "admin" || userData?.role === "premium") && (<Button onClick={generatePDF} className="bg-orange hover:bg-orange/90 text-white" disabled={generatingPDF}><Download className="w-4 h-4 mr-2" />{generatingPDF ? "Génération..." : "PDF"}</Button>)}
            <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
          </div>
        </div>
        {!canEdit && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800"><p>Mode lecture seule.</p></div>)}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            <Image src={luminaire.image || "/placeholder.svg"} alt={luminaire.name || "Luminaire"} fill className="object-cover" />
          </div>
          <div className="aspect-square overflow-y-auto pr-2">
            <div className="space-y-4 font-serif">
              <EditableField value={luminaire.name || ""} onSave={(v) => handleUpdate("name", v)} className="text-2xl font-playfair text-dark" placeholder="Nom du luminaire" disabled={!canEdit}/>
              <div className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label><EditableField value={luminaire.artist || ""} onSave={(v) => handleUpdate("artist", v)} placeholder="Artiste" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label><EditableField value={luminaire.specialty || ""} onSave={(v) => handleUpdate("specialty", v)} placeholder="Spécialité" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label><EditableField value={luminaire.collaboration || ""} onSave={(v) => handleUpdate("collaboration", v)} placeholder="Collaboration" multiline disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Description</label><EditableField value={luminaire.description || ""} onSave={(v) => handleUpdate("description", v)} placeholder="Description" multiline disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Année</label><EditableField value={luminaire.year || ""} onSave={(v) => handleUpdate("year", v)} placeholder="Année" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label><EditableField value={luminaire.dimensions || ""} onSave={(v) => handleUpdate("dimensions", v)} placeholder="Dimensions" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label><EditableField value={luminaire.materials || ""} onSave={(v) => handleUpdate("materials", v)} placeholder="Matériaux" multiline disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Signé</label><EditableField value={luminaire.signed || ""} onSave={(v) => handleUpdate("signed", v)} placeholder="Signature" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label><EditableField value={luminaire.estimation || ""} onSave={(v) => handleUpdate("estimation", v)} placeholder="Estimation" disabled={!canEdit} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Lien internet</label><div className="flex items-center gap-2"><EditableField value={luminaire.url || ""} onSave={(v) => handleUpdate("url", v)} placeholder="https://exemple.com" disabled={!canEdit} />{luminaire.url && (<a href={luminaire.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>)}</div></div>
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
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md group">
                    <div className="aspect-square relative bg-gray-100"><Image src={similar.image || "/placeholder.svg"} alt={similar.name} fill className="object-cover" /></div>
                    <div className="p-4 space-y-2"><h3 className="font-playfair text-lg truncate">{similar.name}</h3><p className="text-sm">{similar.artist}</p><p className="text-xs">{similar.year}</p></div>
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
