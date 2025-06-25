// Fichier : app/luminaire/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// ...autres imports

export default function LuminaireDetailPage() {
  const params = useParams();
  const [luminaire, setLuminaire] = useState<any>(null);
  const [similarLuminaires, setSimilarLuminaires] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ...autres états

  useEffect(() => {
    if (!params.id) return;

    const fetchLuminaire = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/luminaires/${params.id}`);
        if (!res.ok) throw new Error("Luminaire non trouvé");
        const data = await res.json();
        
        if (data.success) {
          setLuminaire(data.data);
          
          // Logique pour trouver les similaires (simplifiée)
          const allRes = await fetch(`/api/luminaires?limit=200`); // On prend un échantillon
          const allData = await allRes.json();
          if (allData.success) {
            // Votre fonction findSimilarLuminaires peut être appelée ici
            // const similar = findSimilarLuminaires(data.data, allData.luminaires);
            // setSimilarLuminaires(similar);
          }

        } else {
          setLuminaire(null);
        }
      } catch (error) {
        console.error("Erreur chargement luminaire:", error);
        setLuminaire(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLuminaire();
  }, [params.id]);

  if (isLoading) return <div className="text-center py-16">Chargement...</div>;

  if (!luminaire) return <div className="text-center py-16">Luminaire non trouvé.</div>;

  // Votre JSX reste quasiment identique mais utilisera `luminaire.images[0]`
  return (
    <div className="container-responsive py-8">
        <h1 className="text-4xl">{luminaire.nom}</h1>
        <p>Par {luminaire.designer}</p>
        {luminaire.images && luminaire.images.length > 0 && (
            <div className="relative w-96 h-96">
                <Image src={luminaire.images[0]} alt={luminaire.nom} fill className="object-cover" />
            </div>
        )}
        {/* ... Reste de votre JSX pour afficher les détails ... */}
    </div>
  );
}
