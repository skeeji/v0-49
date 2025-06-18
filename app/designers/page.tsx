"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState<any[]>([]);
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/designers');
        const data = await response.json();
        if (data.success) {
          // On ajoute un champ 'count' pour la logique de tri future si besoin
          const designersWithCount = data.designers.map((d: any) => ({...d, count: 0}));
          setAllDesigners(designersWithCount);
        }
      } catch (e) {
        console.error("Impossible de charger les designers", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDesigners();
  }, []);

  useEffect(() => {
    let filtered = [...allDesigners];
    if (searchTerm) {
      filtered = filtered.filter((d) => d.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name-asc') return a.nom.localeCompare(b.nom);
      if (sortBy === 'name-desc') return b.nom.localeCompare(a.nom);
      // Le tri par 'count' est conservé si vous voulez le réactiver plus tard
      if (sortBy === 'count-desc') return (b.count || 0) - (a.count || 0);
      return 0;
    });
    
    if (userData?.role === "free") {
      setFilteredDesigners(filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 5)));
    } else {
      setFilteredDesigners(filtered);
    }
  }, [allDesigners, searchTerm, sortBy, userData]);

  if (isLoading) { return <div className="text-center py-16">Chargement...</div>; }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        {userData?.role === "free" && (<div className="bg-blue-50 border p-4 mb-6 text-sm">...</div>)}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
            <SortSelector value={sortBy} onChange={setSortBy} options={[{ value: "name-asc", label: "A → Z" }, { value: "name-desc", label: "Z → A" }]}/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer) => (
            <Link key={designer.slug} href={`/designers/${designer.slug}`}>
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    <Image
                      src={designer.images?.[0] || "/placeholder.svg"}
                      alt={designer.nom}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                  <h3 className="text-xl font-playfair text-dark mb-2">{designer.nom}</h3>
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
