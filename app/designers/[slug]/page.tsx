"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState([])
  const [description, setDescription] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!params.slug) return;

    const designerNameFromSlug = decodeURIComponent(params.slug as string).replace(/-/g, " ");

    async function fetchAndProcessData() {
      setIsLoading(true);
      try {
        // CHANGEMENT : On charge les luminaires depuis l'API
        const response = await fetch('/api/luminaires');
        const data = await response.json();

        if (data.success) {
          const allLuminaires = data.luminaires;
          const luminairesPourCeDesigner = allLuminaires.filter((luminaire: any) => 
            luminaire.designer?.toLowerCase().includes(designerNameFromSlug)
          );
          
          setDesignerLuminaires(luminairesPourCeDesigner);

          // CONSERVÉ : On charge les données éditables depuis localStorage
          const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}");
          const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}");
          
          if (luminairesPourCeDesigner.length > 0) {
            const currentDesignerName = luminairesPourCeDesigner[0].designer;
            const defaultSpecialty = luminairesPourCeDesigner[0].specialite || "";
            
            setDesigner({
              name: currentDesignerName,
              image: "", // Note: l'image du designer doit être gérée via une autre collection
              specialty: defaultSpecialty,
              count: luminairesPourCeDesigner.length,
            });

            setDescription(storedDescriptions[currentDesignerName] || defaultSpecialty);
            setCollaboration(storedCollaborations[currentDesignerName] || luminairesPourCeDesigner[0].collaboration || "");
          }
        }
      } catch (error) {
        console.error("Erreur chargement données designer:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAndProcessData();
  }, [params.slug]);

  // CONSERVÉ : Toutes vos fonctions d'update qui utilisent localStorage
  const updateDescription = (newDescription: string) => {
    if (!designer) return;
    const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}");
    descriptions[designer.name] = newDescription;
    localStorage.setItem("designer-descriptions", JSON.stringify(descriptions));
    setDescription(newDescription);
  }

  const updateCollaboration = (newCollaboration: string) => {
    if (!designer) return;
    const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}");
    collaborations[designer.name] = newCollaboration;
    localStorage.setItem("designer-collaborations", JSON.stringify(collaborations));
    setCollaboration(newCollaboration);
  }

  const updateLuminaire = (id: string, updates: any) => {
    const storedLuminaires = localStorage.getItem("luminaires") // Note: cette fonction est maintenant désynchronisée de la DB
    if (storedLuminaires) {
      const luminaires = JSON.parse(storedLuminaires)
      const updated = luminaires.map((item: any) => (item.id === id ? { ...item, ...updates } : item))
      localStorage.setItem("luminaires", JSON.stringify(updated))
      setDesignerLuminaires(updated.filter((luminaire: any) => luminaire.designer === designer.name))
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement du designer...</div>
  }

  if (!designer) {
    return (
      <div className="container-responsive py-8 text-center">
        <p className="text-lg text-gray-600">Designer non trouvé</p>
        <Link href="/designers"><Button className="mt-4">Retour aux designers</Button></Link>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/designers">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour aux designers
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-48 h-48 relative flex-shrink-0">
              {/* Logique d'affichage de l'image du designer */}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-playfair text-dark mb-4">{designer.name}</h1>
              <p className="text-lg text-gray-600 mb-6">{designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection</p>
              <div className="bg-cream rounded-lg p-4">
                <h3 className="text-lg font-medium text-dark mb-2">Spécialité</h3>
                <EditableField value={description} onSave={updateDescription} placeholder="Spécialité..." multiline />
              </div>
              <div className="bg-cream rounded-lg p-4 mt-4">
                <h3 className="text-lg font-medium text-dark mb-2">Collaboration / Œuvre</h3>
                <EditableField value={collaboration} onSave={updateCollaboration} placeholder="Collaboration..." multiline />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires de {designer.name}</h2>
          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
          ) : (
            <div className="text-center py-12"><p className="text-gray-500">Aucun luminaire trouvé pour ce designer</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
