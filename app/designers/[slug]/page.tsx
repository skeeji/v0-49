// Fichier : app/designer/[slug]/page.tsx
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
const getDesignerName = (str: string = ""): string => {
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
    const designerSlugForSearch = decodeURIComponent(params.slug as string).replace(/-/g, " ");

    async function fetchDesignerData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/luminaires');
        const data = await response.json();

        if (data.success && data.luminaires) {
          const allLuminaires = data.luminaires;
          
          const luminairesPourCeDesigner = allLuminaires.filter((luminaire: any) => 
            getDesignerName(luminaire.designer).toLowerCase() === designerSlugForSearch.toLowerCase()
          );
          
          const adaptedLuminaires = luminairesPourCeDesigner.map((lum: any) => ({
              ...lum,
              id: lum._id,
              image: lum.images?.[0]
          }));

          setDesignerLuminaires(adaptedLuminaires);

          if (adaptedLuminaires.length > 0) {
            const currentDesignerName = getDesignerName(adaptedLuminaires[0].designer);
            const fullDesignerField = adaptedLuminaires[0].designer;
            const defaultSpecialty = adaptedLuminaires[0].specialite || "";
            
            setDesigner({
              name: currentDesignerName,
              image: "", // A gérer
              count: adaptedLuminaires.length,
            });
            
            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}");
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}");

            setDescription(storedDescriptions[fullDesignerField] || defaultSpecialty);
            setCollaboration(storedCollaborations[fullDesignerField] || adaptedLuminaires[0].collaboration || "");
          }
        }
      } catch (error) { console.error("Erreur chargement données designer:", error); } 
      finally { setIsLoading(false); }
    }
    fetchDesignerData();
  }, [params.slug]);

  // Vos fonctions updateDescription, updateCollaboration, updateLuminaire restent ici...
  const updateDescription = (newDescription: string) => { /* Votre code existant */ };
  const updateCollaboration = (newCollaboration: string) => { /* Votre code existant */ };
  const updateLuminaire = (id: string, updates: any) => { /* Votre code existant */ };

  if (isLoading) { return <div className="text-center py-8">Chargement...</div>; }
  if (!designer) { return <div className="text-center py-8">Designer non trouvé.</div>; }

  return (
    // Votre JSX complet ici
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
          {/* ... etc ... */}
          <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
      </div>
    </div>
  )
}
