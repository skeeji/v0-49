"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"

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
    async function fetchAndGroupDesigners() {
        try {
            const response = await fetch('/api/luminaires');
            const data = await response.json();

            if (data.success && data.luminaires) {
                const designerMap = new Map();

                data.luminaires.forEach((luminaire: any) => {
                    const designerName = getDesignerNameOnly(luminaire.designer);
                    if (designerName) {
                        if (!designerMap.has(designerName)) {
                            designerMap.set(designerName, {
                                name: designerName,
                                count: 0,
                                luminaires: [],
                                image: null, // A gérer depuis une autre collection
                                slug: designerName.toLowerCase().replace(/\s+/g, '-'),
                            });
                        }
                        const designer = designerMap.get(designerName);
                        designer.count++;
                        designer.luminaires.push({
                            ...luminaire,
                            id: luminaire._id,
                            image: luminaire.images?.[0]
                        });
                    }
                });

                const designersArray = Array.from(designerMap.values());
                setDesigners(designersArray);
            }
        } catch(e) {
            console.error("Impossible de charger et grouper les designers", e);
        }
    }
    fetchAndGroupDesigners();
  }, []);

  useEffect(() => {
    let filtered = [...designers];
    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "count-desc": return b.count - a.count;
        default: return 0;
      }
    });
    
    if (userData?.role === "free") {
        const limited = filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 5));
        setFilteredDesigners(limited);
    } else {
        setFilteredDesigners(filtered);
    }
  }, [designers, searchTerm, sortBy, userData]);

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        {userData?.role === "free" && (<div className="bg-blue-50 border p-4 mb-6 text-sm"><p>Vous utilisez un compte gratuit. Seuls 10% des designers sont affichés. <Link href="#" className="underline font-medium">Passez à Premium</Link></p></div>)}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
            <SortSelector value={sortBy} onChange={setSortBy} options={[{ value: "name-asc", label: "A → Z" }, { value: "name-desc", label: "Z → A" }, { value: "count-desc", label: "Nb de luminaires" },]}/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer, index) => (
            <Link key={index} href={`/designer/${designer.slug}`}>
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl h-full">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    {designer.image ? (<Image src={designer.image} alt={designer.name} fill className="object-cover rounded-full" />) : (<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full"><div className="text-center"><div className="text-2xl">👤</div></div></div>)}
                  </div>
                  <h3 className="text-xl font-playfair text-dark mb-2">{designer.name}</h3>
                  <p className="text-gray-600 mb-4">{designer.count} luminaire{designer.count > 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                      <div key={idx} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image src={luminaire.image || "/placeholder.svg"} alt={luminaire.name} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-orange hover:text-orange/80 font-medium">Voir le profil →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filteredDesigners.length === 0 && (<div className="text-center py-12"><p className="text-gray-500 text-lg">Aucun designer trouvé</p></div>)}
      </div>
    </div>
  )
}
