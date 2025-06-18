"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState<any[]>([]);
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  useEffect(() => {
    async function fetchDesigners() {
      try {
        // CORRECTION : On appelle uniquement l'API des designers
        const response = await fetch('/api/designers');
        const data = await response.json();
        if (data.success) {
          setAllDesigners(data.designers);
          setFilteredDesigners(data.designers); // Initialise avec toutes les données
        }
      } catch(e) {
        console.error("Impossible de charger les designers", e);
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
      return 0;
    });
    setFilteredDesigners(filtered);
  }, [allDesigners, searchTerm, sortBy]);

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
            <SortSelector value={sortBy} onChange={setSortBy} options={[{ value: "name-asc", label: "A → Z" }, { value: "name-desc", label: "Z → A" }]}/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer) => (
            <Link key={designer.slug} href={`/designers/${designer.slug}`}>
              <div className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl h-full flex flex-col items-center text-center">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <Image
                    src={designer.images?.[0] || "/placeholder.svg"}
                    alt={designer.nom}
                    fill
                    className="object-cover rounded-full"
                    sizes="96px"
                  />
                </div>
                <h3 className="text-lg font-playfair text-dark mb-2 flex-grow">{designer.nom}</h3>
                <span className="text-orange hover:text-orange/80 font-medium mt-auto">Voir le profil →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
