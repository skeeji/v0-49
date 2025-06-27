"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"

const getDesignerNameOnly = (str: string = ""): string => {
    if (!str) return "";
    return str.split('(')[0].trim();
};

export default function DesignerDetailPage() {
  const params = useParams();
  const [designer, setDesigner] = useState<any>(null);
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [collaboration, setCollaboration] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    const designerSlug = decodeURIComponent(params.slug as string);

    async function fetchDesignerData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/luminaires');
        const data = await response.json();

        if (data.success && data.luminaires) {
          const luminairesPourCeDesigner = data.luminaires.filter((luminaire: any) => {
              const nameOnly = getDesignerNameOnly(luminaire.designer);
              return nameOnly.toLowerCase().replace(/\s+/g, '-') === designerSlug;
          });
          
          const adaptedLuminaires = luminairesPourCeDesigner.map((lum: any) => ({
            ...lum, id: lum._id, image: lum.images?.[0]
          }));
          setDesignerLuminaires(adaptedLuminaires);

          if (adaptedLuminaires.length > 0) {
            const currentDesignerName = getDesignerNameOnly(adaptedLuminaires[0].designer);
            const fullDesignerField = adaptedLuminaires[0].designer;
            const defaultSpecialty = adaptedLuminaires[0].specialite || "";
            
            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}");
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}");
            
            setDesigner({ name: currentDesignerName, count: adaptedLuminaires.length });
            setDescription(storedDescriptions[fullDesignerField] || defaultSpecialty);
            setCollaboration(storedCollaborations[fullDesignerField] || adaptedLuminaires[0].collaboration || "");
          }
        }
      } catch (error) { console.error("Erreur chargement:", error); } 
      finally { setIsLoading(false); }
    }
    fetchDesignerData();
  }, [params.slug]);
  
  // Vos fonctions updateDescription, updateCollaboration, etc.
  const updateDescription = (newDescription: string) => { /* ... votre code ... */ };
  const updateCollaboration = (newCollaboration: string) => { /* ... votre code ... */ };
  const updateLuminaire = (id: string, updates: any) => { /* ... votre code ... */ };

  if (isLoading) { return <div className="text-center py-8">Chargement...</div>; }
  if (!designer) { return <div className="text-center py-8">Designer non trouvé.</div>; }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* ... votre JSX complet ici, il fonctionnera car les données sont au bon format ... */}
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires de {designer.name}</h2>
          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
          ) : (
            <div className="text-center py-12"><p>Aucun luminaire trouvé.</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
