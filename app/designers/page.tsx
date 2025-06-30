"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Users, Palette, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Designer {
  nom: string
  imagedesigner?: string
  totalLuminaires: number
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        setLoading(true)
        console.log("🔍 Chargement des designers...")

        const response = await fetch("/api/designers-data")
        const data = await response.json()

        console.log("📊 Réponse API designers:", data)

        if (data.success && data.designers) {
          // Filtrer les designers qui ont un nom valide
          const validDesigners = data.designers.filter(
            (designer: any) => designer && designer.nom && typeof designer.nom === "string" && designer.nom.trim(),
          )

          setDesigners(validDesigners)
          setFilteredDesigners(validDesigners)
        }
      } catch (error) {
        console.error("❌ Erreur API:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDesigners(designers)
    } else {
      const filtered = designers.filter(
        (designer) => designer.nom && designer.nom.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredDesigners(filtered)
    }
  }, [searchTerm, designers])

  // Fonction pour créer un slug sûr pour l'URL
  const createDesignerSlug = (name: string) => {
    // Vérifier que name existe et est une string
    if (!name || typeof name !== "string") {
      return "designer-inconnu"
    }
    // Ne pas encoder, juste nettoyer les caractères problématiques
    return name.trim()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-10 w-full max-w-md mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-48" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            Designers
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez les créateurs talentueux derrière notre collection de luminaires d'exception
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Rechercher un designer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>

        {/* Statistiques */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            {filteredDesigners.length} designer{filteredDesigners.length > 1 ? "s" : ""} trouvé
            {filteredDesigners.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Grille des designers */}
        {filteredDesigners.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun designer trouvé</h3>
            <p className="text-gray-500">
              {searchTerm ? "Essayez avec d'autres mots-clés" : "Aucun designer disponible pour le moment"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDesigners.map((designer, index) => (
              <Link key={index} href={`/designers/${createDesignerSlug(designer.nom)}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                  <CardContent className="p-0">
                    {/* Image du designer */}
                    <div className="relative w-full h-48 bg-gray-100">
                      {designer.imagedesigner ? (
                        <Image
                          src={`/api/images/filename/${designer.imagedesigner}`}
                          alt={designer.nom || "Designer"}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=200&width=200&text=Designer"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                          <Users className="w-12 h-12 text-blue-400" />
                        </div>
                      )}
                    </div>

                    {/* Informations du designer */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {designer.nom || "Designer inconnu"}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Palette className="w-4 h-4" />
                          <span>
                            {designer.totalLuminaires || 0} luminaire{(designer.totalLuminaires || 0) > 1 ? "s" : ""}
                          </span>
                        </div>

                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
