"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Users, SortAsc, SortDesc, Grid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Designer {
  _id: string
  Nom: string
  imagedesigner?: string
  luminaireCount?: number
  specialite?: string
  periode?: string
}

// Fonction pour créer un slug à partir du nom du designer
function createDesignerSlug(name: string): string {
  if (!name || typeof name !== "string") {
    return "designer-inconnu"
  }
  return name.trim()
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [displayedCount, setDisplayedCount] = useState(24)

  // Charger les designers
  const fetchDesigners = useCallback(async () => {
    try {
      setLoading(true)
      console.log("🔍 Chargement des designers...")

      const response = await fetch("/api/designers")
      const data = await response.json()

      console.log("📊 Réponse API designers:", data)

      if (data.success) {
        // Filtrer les designers valides
        const validDesigners = data.designers.filter(
          (designer: any) => designer && designer.Nom && typeof designer.Nom === "string" && designer.Nom.trim(),
        )
        setDesigners(validDesigners)
        setFilteredDesigners(validDesigners)
      } else {
        console.error("❌ Erreur API:", data.message)
        setDesigners([])
        setFilteredDesigners([])
      }
    } catch (error) {
      console.error("❌ Erreur chargement designers:", error)
      setDesigners([])
      setFilteredDesigners([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDesigners()
  }, [fetchDesigners])

  // Filtrer et trier les designers
  useEffect(() => {
    const filtered = designers.filter(
      (designer) => designer.Nom && designer.Nom.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // Trier
    filtered.sort((a, b) => {
      let aValue: string | number = ""
      let bValue: string | number = ""

      switch (sortBy) {
        case "name":
          aValue = a.Nom || ""
          bValue = b.Nom || ""
          break
        case "luminaires":
          aValue = a.luminaireCount || 0
          bValue = b.luminaireCount || 0
          break
        default:
          aValue = a.Nom || ""
          bValue = b.Nom || ""
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
      }
    })

    setFilteredDesigners(filtered)
    setDisplayedCount(24) // Reset à 24 lors d'un nouveau filtre
  }, [designers, searchTerm, sortBy, sortOrder])

  const loadMore = () => {
    setDisplayedCount((prev) => prev + 24)
  }

  const displayedDesigners = filteredDesigners.slice(0, displayedCount)
  const hasMore = displayedCount < filteredDesigners.length

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
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
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Designers ({filteredDesigners.length})</h1>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher un designer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tri */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="luminaires">Nombre de luminaires</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordre de tri */}
          <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>

          {/* Mode d'affichage */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grille des designers */}
        {filteredDesigners.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun designer trouvé</h3>
            <p className="text-gray-500">
              {searchTerm ? "Essayez avec d'autres mots-clés" : "Aucun designer disponible"}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-6 ${
                viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
              }`}
            >
              {displayedDesigners.map((designer) => (
                <Link key={designer._id} href={`/designers/${createDesignerSlug(designer.Nom)}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                    <CardContent className="p-0">
                      {viewMode === "grid" ? (
                        <>
                          {/* Image du designer */}
                          <div className="relative w-full h-48 bg-gray-100">
                            {designer.imagedesigner ? (
                              <Image
                                src={`/api/images/filename/${designer.imagedesigner}`}
                                alt={designer.Nom}
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
                              {designer.Nom}
                            </h3>

                            <div className="space-y-2">
                              {designer.luminaireCount !== undefined && (
                                <Badge variant="secondary" className="text-xs">
                                  {designer.luminaireCount} luminaire{designer.luminaireCount > 1 ? "s" : ""}
                                </Badge>
                              )}

                              {designer.specialite && (
                                <p className="text-sm text-gray-600 line-clamp-1">{designer.specialite}</p>
                              )}

                              {designer.periode && <p className="text-xs text-gray-500">{designer.periode}</p>}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Mode liste */
                        <div className="flex items-center p-4 space-x-4">
                          <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {designer.imagedesigner ? (
                              <Image
                                src={`/api/images/filename/${designer.imagedesigner}`}
                                alt={designer.Nom}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=64&width=64&text=Designer"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                                <Users className="w-6 h-6 text-blue-400" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                              {designer.Nom}
                            </h3>

                            <div className="flex items-center gap-2 flex-wrap">
                              {designer.luminaireCount !== undefined && (
                                <Badge variant="secondary" className="text-xs">
                                  {designer.luminaireCount} luminaire{designer.luminaireCount > 1 ? "s" : ""}
                                </Badge>
                              )}

                              {designer.specialite && (
                                <span className="text-sm text-gray-600">{designer.specialite}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Bouton "Charger plus" */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button onClick={loadMore} variant="outline" size="lg">
                  Charger plus de designers
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
