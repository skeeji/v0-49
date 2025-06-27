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
        if (!response.ok) throw new Error("Luminaire non trouvé via API");
        const result = await response.json();
        if (result.success) {
          const formattedLuminaire = { ...result.data, id: result.data._id, image: result.data.images?.[0], artist: result.data.designer, year: result.data.annee, materials: Array.isArray(result.data.materiaux) ? result.data.materiaux.join(', ') : "", signed: result.data.signe, };
          setLuminaire(formattedLuminaire);
          
          // --- Ligne modifiée comme demandé ---
          const allLuminairesResponse = await fetch('/api/luminaires?full=true');
          // --- Fin de la modification ---

          const allLuminairesData = await allLuminairesResponse.json();
          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires);
            setSimilarLuminaires(similar);
          }
        } else { setLuminaire(null); }
      } catch (error) { console.error("Erreur chargement du luminaire:", error); setLuminaire(null); } 
      finally { setIsLoading(false); }
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      setIsFavorite(favorites.includes(params.id as string));
    }
    fetchLuminaireData();
  }, [params.id]);

  const findSimilarLuminaires = (current: any, all: any[]) => { /* ... Votre fonction est correcte ... */ };
  const handleUpdate = async (field: string, value: string) => { /* ... Votre fonction est correcte ... */ };
  const toggleFavorite = () => { /* ... Votre fonction est correcte ... */ };


  const generatePDF = async () => {
    if (generatingPDF || !luminaire) return
    setGeneratingPDF(true)

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("FICHE TECHNIQUE LUMINAIRE", 105, 20, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);

      let yPosition = 40;

      if (luminaire.image && !luminaire.image.includes("placeholder.svg")) {
        try {
          const response = await fetch(luminaire.image);
          const blob = await response.blob();
          const imgData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const img = new window.Image();
          img.src = imgData;
          await new Promise(resolve => { img.onload = resolve; });

          const imgRatio = img.height / img.width;
          const imgWidth = 80;
          const imgHeight = imgWidth * imgRatio;
          const xPosition = (210 - imgWidth) / 2;

          doc.addImage(imgData, "JPEG", xPosition, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (error) {
          console.error("Erreur chargement de l'image pour le PDF:", error);
        }
      }
      
      const addInfoLine = (label: string, value: string | string[], isMultiline = false) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        const textValue = Array.isArray(value) ? value.join(', ') : value;
        if (!textValue.trim()) return;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(label + ":", 20, yPosition);
        doc.setFont("helvetica", "normal");
        const textLines = doc.splitTextToSize(textValue, 125);
        doc.text(textLines, 65, yPosition);
        yPosition += (textLines.length * 7) + 2;
      }

      addInfoLine("Nom du luminaire", luminaire.name);
      addInfoLine("Artiste / Dates", luminaire.artist);
      addInfoLine("Spécialité", luminaire.specialty);
      addInfoLine("Collaboration / Œuvre", luminaire.collaboration);
      addInfoLine("Description", luminaire.description, true);
      addInfoLine("Année", luminaire.year);
      addInfoLine("Dimensions", luminaire.dimensions);
      addInfoLine("Matériaux", luminaire.materials);
      addInfoLine("Signé", luminaire.signed);
      addInfoLine("Estimation", luminaire.estimation);
      addInfoLine("Lien internet", luminaire.url);
      
      const fileName = `${luminaire.name || "luminaire"}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (isLoading || authLoading) { return <div className="text-center py-16">Chargement...</div>; }

  if (!luminaire) {
    return (
      <div className="container-responsive py-8 text-center">
        <p className="text-lg text-gray-600">Luminaire non trouvé.</p>
        <Link href="/"><Button className="mt-4">Retour</Button></Link>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à la galerie
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {(userData?.role === "admin" || userData?.role === "premium") && (
              <Button onClick={generatePDF} className="bg-orange hover:bg-orange/90 text-white" disabled={generatingPDF}>
                <Download className="w-4 h-4 mr-2" />
                {generatingPDF ? "Génération..." : "Télécharger PDF"}
              </Button>
            )}
            <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            <Image
              src={luminaire.image || "/placeholder.svg?height=600&width=600"}
              alt={luminaire.name || "Luminaire"}
              fill
              className="object-cover"
            />
          </div>
          <div className="aspect-square overflow-y-auto pr-2">
            <div className="space-y-4 font-serif">
              <div>
                {canEdit ? (
                  <EditableField value={luminaire.name || ""} onSave={(value) => handleUpdate("name", value)} className="text-2xl font-playfair text-dark" placeholder="Nom du luminaire" />
                ) : (
                  <h1 className="text-2xl font-playfair text-dark">{luminaire.name || "Nom non renseigné"}</h1>
                )}
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label>{canEdit ? <EditableField value={luminaire.artist || ""} onSave={(value) => handleUpdate("artist", value)} placeholder="Nom de l'artiste" /> : <p>{luminaire.artist || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label>{canEdit ? <EditableField value={luminaire.specialty || ""} onSave={(value) => handleUpdate("specialty", value)} placeholder="Spécialité" multiline /> : <p className="whitespace-pre-wrap">{luminaire.specialty || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label>{canEdit ? <EditableField value={luminaire.collaboration || ""} onSave={(value) => handleUpdate("collaboration", value)} placeholder="Collaboration" multiline /> : <p className="whitespace-pre-wrap">{luminaire.collaboration || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Description</label>{canEdit ? <EditableField value={luminaire.description || ""} onSave={(value) => handleUpdate("description", value)} placeholder="Description" multiline /> : <p className="whitespace-pre-wrap">{luminaire.description || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Année</label>{canEdit ? <EditableField value={luminaire.year || ""} onSave={(value) => handleUpdate("year", value)} placeholder="Année" /> : <p>{luminaire.year || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label>{canEdit ? <EditableField value={luminaire.dimensions || ""} onSave={(value) => handleUpdate("dimensions", value)} placeholder="Dimensions" /> : <p>{luminaire.dimensions || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>{canEdit ? <EditableField value={luminaire.materials || ""} onSave={(value) => handleUpdate("materials", value)} placeholder="Matériaux" multiline /> : <p className="whitespace-pre-wrap">{luminaire.materials || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Signé</label>{canEdit ? <EditableField value={luminaire.signed || ""} onSave={(value) => handleUpdate("signed", value)} placeholder="Signature" /> : <p>{luminaire.signed || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label>{canEdit ? <EditableField value={luminaire.estimation || ""} onSave={(value) => handleUpdate("estimation", value)} placeholder="Estimation" /> : <p>{luminaire.estimation || "Non renseigné"}</p>}</div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Lien internet</label><div className="flex items-center gap-2">{canEdit ? <EditableField value={luminaire.url || ""} onSave={(value) => handleUpdate("url", value)} placeholder="https://exemple.com" /> : <p>{luminaire.url || "Non renseigné"}</p>}{luminaire.url && (<a href={luminaire.url} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange/80"><ExternalLink className="w-4 h-4" /></a>)}</div></div>
              </div>
            </div>
          </div>
        </div>
        {similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires similaires ({similarLuminaires.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarLuminaires.map((similar: any) => (
                <Link key={similar.id} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md group">
                    <div className="aspect-square relative bg-gray-100"><Image src={similar.image || "/placeholder.svg"} alt={similar.name} fill className="object-cover group-hover:scale-105 transition-transform"/></div>
                    <div className="p-4 space-y-2"><h3 className="font-playfair text-lg text-dark truncate">{similar.name}</h3><p className="text-gray-600 text-sm">{similar.artist}</p><p className="text-gray-500 text-xs">{similar.year}</p></div>
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
