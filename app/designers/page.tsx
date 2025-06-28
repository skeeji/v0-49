"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { Button } from "@/components/ui/button"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

// Fonction pour créer un slug à partir d'un nom
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, "") // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, "-") // Remplacer espaces par tirets
    .replace(/-+/g, "-") // Éviter les tirets multiples
    .trim()
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDesigners() {
      setIsLoading(true)
      try {
        console.log("🔍 Chargement des designers...")
        const response = await fetch("/api/designers")
        const data = await response.json()

        console.log("📊 Réponse API designers:", data)

        if (data.success && data.designers) {
          setDesigners(data.designers)
          setFilteredDesigners(data.designers)
          console.log(`✅ ${data.designers.length} designers chargés`)
        } else {
          console.error("❌ Erreur API designers:", data.error)
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des designers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDesigners()
  }, [])

  // Filtrer et trier les designers
  useEffect(() => {
    let filtered = [...designers]

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Trier
    const [field, direction] = sortBy.split("-")
    filtered.sort((a, b) => {
      const aValue = field === "name" ? a.name : a.count
      const bValue = field === "name" ? b.name : b.count

      if (field === "name") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return direction === "asc" ? aValue - bValue : bValue - aValue
      }
    })

    setFilteredDesigners(filtered)
  }, [designers, searchTerm, sortBy])

  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-orange/10 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange mr-2"></div>
            <span className="text-orange">Chargement des designers...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />

            <SortSelector
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "name-asc", label: "A → Z" },
                { value: "name-desc", label: "Z → A" },
                { value: "count-desc", label: "Plus de luminaires" },
                { value: "count-asc", label: "Moins de luminaires" },
              ]}
            />
          </div>
        </div>

        {/* Liste des designers */}
        {filteredDesigners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDesigners.map((designer) => (
              <Link
                key={designer.slug}
                href={`/designers/${designer.slug}`}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-playfair text-dark hover:text-orange transition-colors truncate">
                      {designer.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun designer trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
            <Button onClick={() => setSearchTerm("")} className="mt-4 bg-orange">
              Réinitialiser la recherche
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
