"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Grid, List, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DesignerPage() {
  const params = useParams()
  const slug = params.slug as string

  const [designer, setDesigner] = useState<any>(null)
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDesigner() {
      if (!slug) return

      setIsLoading(true)
      setError(null)

      try {
        console.log(`🔍 Chargement du designer: ${slug}`)

        const response = await fetch(`/api/designers/${encodeURIComponent(slug)}`)
        const data = await response.json()

        console.log("📊 Réponse API designer:", data)

        if (data.success) {
          setDesigner(data.designer)
          setLuminaires(data.luminaires)
          setFilteredLuminaires(data.luminaires)
          console.log(`✅ Designer chargé: ${data.designer.nom}`)
          console.log(`💡 ${data.luminaires.length} luminaires trouvés`)
        } else {
          setError(data.error || "Designer non trouvé")
          console.log("❌ Erreur API:", data.error)
        }
      } catch (err: any) {
        console.error("❌ Erreur lors du chargement:", err)
        setError("Erreur lors du chargement du designer")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDesigner()
  }, [slug])

  // Filtrer les luminaires
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLuminaires(luminaires)
    } else {
      const filtered = luminaires.filter((lum) => lum.name.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredLuminaires(filtered)
    }
  }, [luminaires, searchTerm])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">Chargement du designer...</p>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-lg text-red-600 mb-4">{error || "Designer non trouvé"}</p>
          <Link href="/designers">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux designers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/designers">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux designers
            </Button>
          </Link>
        </div>

        {/* En-tête du designer */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image du designer */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 relative overflow-hidden rounded-xl bg-gray-100">
                {designer.imagedesigner ? (
                  <Image
                    src={`/api/images/filename/${designer.imagedesigner}`}
                    alt={designer.nom}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400 text-6xl font-serif">{designer.nom.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informations du designer */}
            <div className="flex-1">
              <h1 className="text-4xl font-serif text-gray-900 mb-4">{designer.nom}</h1>
              <div className="space-y-2 text-gray-600">
                <p className="text-lg">
                  <span className="font-medium">{filteredLuminaires.length}</span> luminaire
                  {filteredLuminaires.length !== 1 ? "s" : ""} dans la collection
                </p>
                {designer.bio && <p className="text-gray-700 leading-relaxed">{designer.bio}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher dans les luminaires..." />
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grille des luminaires */}
        {filteredLuminaires.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">
              {searchTerm ? "Aucun luminaire trouvé pour cette recherche" : "Aucun luminaire trouvé pour ce designer"}
            </p>
            {searchTerm && (
              <Button onClick={() => setSearchTerm("")} variant="outline" className="mt-4">
                Effacer la recherche
              </Button>
            )}
          </div>
        ) : (
          <GalleryGrid items={filteredLuminaires} viewMode={viewMode} onItemUpdate={() => {}} />
        )}
      </div>
    </div>
  )
}
