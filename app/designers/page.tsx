"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"
import { createSlug } from "@/lib/utils"

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAndProcessData() {
      setIsLoading(true);
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
                  slug: createSlug(designerName),
                });
              }
              const designerEntry = designerMap.get(designerName);
              designerEntry.count++;
              designerEntry.luminaires.push({ image: luminaire.images?.[0] });
            }
          });
          setDesigners(Array.from(designerMap.values()));
        }
      } catch (e) { console.error("Impossible de charger les données des designers", e); } 
      finally { setIsLoading(false); }
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

    if (userData?.role === "free") {
      const limitedDesigners = filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 5));
      setFilteredDesigners(limitedDesigners);
    } else {
      setFilteredDesigners(filtered);
    }
  }, [designers, searchTerm, sortBy, userData]);
  
  if (isLoading) { return <div className="text-center py-16">Chargement...</div>; }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        {userData?.role === "free" && ( <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800"><p className="flex items-center"><span className="mr-2">ℹ️</span><span>Vous utilisez un compte gratuit. Seuls 10% des designers sont affichés. <Link href="#" className="ml-1 underline font-medium">Passez à Premium</Link> pour voir tous les designers.</span></p></div> )}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
            <SortSelector value={sortBy} onChange={setSortBy} options={[{ value: "name-asc", label: "A → Z" }, { value: "name-desc", label: "Z → A" }, { value: "count-desc", label: "Nb de luminaires" },]}/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer) => (
            <Link key={designer.slug} href={`/designers/${designer.slug}`}>
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    {designer.image ? (<Image src={designer.image} alt={designer.name} fill className="object-cover rounded-full" />) : (<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200"><div className="text-center"><div className="text-2xl text-gray-400 mb-1">👤</div><span className="text-xs text-gray-500">Image manquante</span></div></div>)}
                  </div>
                  <h3 className="text-xl font-playfair text-dark mb-2">{designer.name}</h3>
                  <p className="text-gray-600 mb-4">{designer.count} luminaire{designer.count > 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                      <div key={idx} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image src={luminaire.image || "/placeholder.svg?height=80&width=80"} alt={""} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-orange hover:text-orange/80 font-medium">Voir le profil →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filteredDesigners.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun designer trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Importez des luminaires et des designers pour voir cette section</p>
          </div>
        )}
      </div>
    </div>
  )
}
