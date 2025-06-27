"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"

// Fonction pour extraire le nom de l'artiste de la chaine de caractères
const getDesignerNameOnly = (str: string = ""): string => {
    if (!str) return "";
    return str.split('(')[0].trim();
};

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([])
  const [description, setDescription] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!params.slug) return;
    
    const designerSlug = decodeURIComponent(params.slug as string);

    async function fetchDesignerData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/luminaires');
        const data = await response.json();

        if (data.success && data.luminaires) {
          const allLuminaires = data.luminaires;
          
          // CORRECTION : On filtre en utilisant la fonction qui extrait le nom
          const luminairesPourCeDesigner = allLuminaires.filter((luminaire: any) => 
            getDesignerNameOnly(luminaire.designer).toLowerCase().replace(/\s+/g, '-') === designerSlug
          );
          
          // CORRECTION : On "traduit" les données pour que GalleryGrid les comprenne
          const adaptedLuminaires = luminairesPourCeDesigner.map((lum: any) => ({
              ...lum,
              id: lum._id,
              image: lum.images?.[0],
              artist: getDesignerNameOnly(lum.designer), // On utilise le nom propre
              year: lum.annee,
          }));

          setDesignerLuminaires(adaptedLuminaires);

          if (adaptedLuminaires.length > 0) {
            const currentDesignerName = getDesignerNameOnly(adaptedLuminaires[0].designer);
            const fullDesignerField = adaptedLuminaires[0].designer;
            const defaultSpecialty = adaptedLuminaires[0].specialite || "";
            
            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}");
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}");
            
            setDesigner({
              name: currentDesignerName,
              image: null, // L'image du designer vient d'une autre collection
              count: adaptedLuminaires.length,
            });

            setDescription(storedDescriptions[fullDesignerField] || defaultSpecialty);
            setCollaboration(storedCollaborations[fullDesignerField] || adaptedLuminaires[0].collaboration || "");
          }
        }
      } catch (error) { console.error("Erreur chargement données designer:", error); } 
      finally { setIsLoading(false); }
    }
    fetchDesignerData();
  }, [params.slug]);
  
  // Fonctions pour mettre à jour les descriptions (conservées)
  const updateDescription = (newDescription: string) => { /* Votre code existant est OK */ };
  const updateCollaboration = (newCollaboration: string) => { /* Votre code existant est OK */ };
  const updateLuminaire = (id: string, updates: any) => { /* Votre code existant est OK */ };

  if (isLoading) { return <div className="text-center py-8">Chargement...</div>; }
  if (!designer) { return ( <div className="container-responsive py-8 text-center"><p>Designer non trouvé.</p><Link href="/designers"><Button className="mt-4">Retour</Button></Link></div> ); }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/designers"><Button variant="outline" className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Retour aux designers</Button></Link>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-48 h-48 relative flex-shrink-0"><div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200"><div className="text-center"><div className="text-6xl text-gray-400 mb-2">👤</div><span className="text-sm text-gray-500">Image</span></div></div></div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-playfair text-dark mb-4">{designer.name}</h1>
              <p className="text-lg text-gray-600 mb-6">{designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection</p>
              <div className="bg-cream rounded-lg p-4"><h3 className="text-lg font-medium text-dark mb-2">Spécialité</h3><EditableField value={description} onSave={updateDescription} multiline /></div>
              <div className="bg-cream rounded-lg p-4 mt-4"><h3 className="text-lg font-medium text-dark mb-2">Collaboration / Œuvre</h3><EditableField value={collaboration} onSave={updateCollaboration} multiline /></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires de {designer.name}</h2>
          {designerLuminaires.length > 0 ? (<GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />) : (<div className="text-center py-12"><p>Aucun luminaire trouvé.</p></div>)}
        </div>
      </div>
    </div>
  )
}
