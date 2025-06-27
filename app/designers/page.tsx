"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)
  const { userData } = useAuth()

  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/designers")
        const data = await response.json()

        if (data.success && data.designers) {
          setDesigners(data.designers)
        } else {
          console.error("Erreur lors du chargement des designers:", data.error)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des designers:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDesigners()
  }, [])

  useEffect(() => {
    let filtered = [...designers]

    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.nom.localeCompare(b.nom)
        case "name-desc":
          return b.nom.localeCompare(a.nom)
        case "count-desc":
          return b.count - a.count
        default:
          return 0
      }
    })

    if (userData?.role === "free") {
      const limited = filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 5))
      setFilteredDesigners(limited)
    } else {
      setFilteredDesigners(filtered)
    }
  }, [designers, searchTerm, sortBy, userData])

  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange mx-auto mb-4"></div>
          <p>Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>

        {userData?.role === "free" && (
          <div className="bg-blue-50 border p-4 mb-6 text-sm">
            <p>
              Vous utilisez un compte gratuit. Seuls 10% des designers sont affichés.
              <Link href="#" className="underline font-medium ml-1">
                Passez à Premium
              </Link>
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
            <SortSelector
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "name-asc", label: "A → Z" },
                { value: "name-desc", label: "Z → A" },
                { value: "count-desc", label: "Nb de luminaires" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDesigners.map((designer, index) => (
            <Link key={index} href={`/designers/${designer.slug}`}>
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow h-full">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    {designer.image ? (
                      <Image
                        src={designer.image || "/placeholder.svg"}
                        alt={designer.nom}
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full">
                        <div className="text-center">
                          <div className="text-2xl">👤</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-playfair text-dark mb-2">{designer.nom}</h3>
                  <p className="text-gray-600 mb-4">
                    {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                      <div key={idx} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={luminaire.image || "/placeholder.svg"}
                          alt={luminaire.nom}
                          fill
                          className="object-cover"
                        />
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
          </div>
        )}
      </div>
    </div>
  )
}
