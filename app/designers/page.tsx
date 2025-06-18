"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"

// Fonction pour extraire le nom de l'artiste de la chaine de caractères
const getDesignerNameOnly = (str: string = ""): string => {
    if (!str) return "";
    return str.split('(')[0].trim();
};

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const { userData } = useAuth()

  useEffect(() => {
    async function fetchAndProcessData() {
      try {
        const [luminaireRes, designerRes] = await Promise.all([
            fetch('/api/luminaires'),
            fetch('/api/designers')
        ]);

        const luminaireData = await luminaireRes.json();
        const designerData = await designerRes.json();

        if (luminaireData.success && designerData.success) {
            const allLuminaires = luminaireData.luminaires;
            const allDesigners = designerData.designers;
            const designerMap = new Map();

            allLuminaires.forEach((luminaire: any) => {
                const designerName = getDesignerNameOnly(luminaire.designer);
                if (designerName) {
                    if (!designerMap.has(designerName)) {
                        const matchingImportedDesigner = allDesigners.find((d: any) => getDesignerNameOnly(d.nom) === designerName);
                        designerMap.set(designerName, {
                            name: designerName,
                            count: 0,
                            luminaires: [],
                            image: matchingImportedDesigner?.images?.[0] || null,
                            // CORRECTION : On utilise le nom complet encodé pour le lien
                            urlName: encodeURIComponent(designerName), 
                        });
                    }
                    const designerEntry = designerMap.get(designerName);
                    designerEntry.count++;
                    designerEntry.luminaires.push({ image: luminaire.images?.[0] });
                }
            });
            setDesigners(Array.from(designerMap.values()));
        }
      } catch(e) { console.error("Impossible de charger les données", e); }
    }
    fetchAndProcessData();
  }, []);

  useEffect(() => {
    let filtered = [...designers];
    if (searchTerm) {
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'count-desc') return b.count - a.count;
      return 0;
    });
    setFilteredDesigners(filtered);
  }, [designers, searchTerm, sortBy]);

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
            {/* Le reste du JSX pour les filtres... */}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer) => (
            <Link key={designer.name} href={`/designers/${designer.urlName}`}>
              <div className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl h-full flex flex-col items-center text-center">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <Image src={designer.image || "/placeholder.svg"} alt={designer.name} fill className="object-cover rounded-full" />
                </div>
                <h3 className="text-lg font-playfair text-dark mb-2 flex-grow">{designer.name}</h3>
                <p className="text-gray-600 mb-4">{designer.count} luminaire{designer.count > 1 ? "s" : ""}</p>
                <div className="grid grid-cols-3 gap-1 mb-4 w-full">
                  {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                    <div key={idx} className="aspect-square relative bg-gray-100 rounded-md overflow-hidden">
                      <Image src={luminaire.image || "/placeholder.svg"} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
                <span className="text-orange hover:text-orange/80 font-medium mt-auto">Voir le profil →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
