"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GalleryGrid } from "@/components/GalleryGrid"

export default function DesignerDetailPage() {
  const params = useParams();
  const [designer, setDesigner] = useState<any>(null);
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    const slug = params.slug as string;

    async function fetchDesignerData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/designers/${slug}`);
        const result = await response.json();

        if (result.success) {
          setDesigner(result.data.designer);
          
          // On adapte les données des luminaires pour la grille
          const adaptedLuminaires = result.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.images?.[0],
            artist: lum.designer,
            year: lum.annee,
          }));
          setDesignerLuminaires(adaptedLuminaires);
        } else {
          setDesigner(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données du designer:", error);
        setDesigner(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDesignerData();
  }, [params.slug]);
  
  if (isLoading) { return <div className="text-center py-16">Chargement...</div>; }

  if (!designer) { return <div className="container-responsive py-8 text-center"><p className="text-lg">Désolé, ce designer n'a pas été trouvé.</p><Link href="/designers"><Button className="mt-4">Retour à la liste</Button></Link></div>; }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/designers"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Retour aux designers</Button></Link>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-48 h-48 relative flex-shrink-0">
              <Image
                src={designer.images?.[0] || "/placeholder.svg"}
                alt={designer.nom}
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-playfair text-dark mb-4">{designer.nom}</h1>
              <p className="text-lg text-gray-600 mb-6">{designerLuminaires.length} luminaire{designerLuminaires.length > 1 ? "s" : ""} trouvé{designerLuminaires.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires de {designer.nom}</h2>
          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={() => {}} />
          ) : (
            <div className="text-center py-12"><p>Aucun luminaire n'est actuellement associé à ce designer.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
