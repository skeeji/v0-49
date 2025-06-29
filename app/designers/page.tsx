"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  nom: string
  count: number
  image?: string
  slug: string
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        console.log("🔍 Chargement des designers...")
        const response = await fetch("/api/designers-data")
        const data = await response.json()

        if (data.success) {
          console.log(`✅ ${data.designers.length} designers chargés`)
          setDesigners(data.designers)
          setFilteredDesigners(data.designers)
        } else {
          console.error("❌ Erreur chargement designers:", data.error)
        }
      } catch (error) {
        console.error("❌ Erreur chargement designers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  useEffect(() => {
    const filtered = designers.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredDesigners(filtered)
    setCurrentPage(1)
  }, [searchTerm, designers])

  // Pagination
  const totalPages = Math.ceil(filteredDesigners.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDesigners = filteredDesigners.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-serif text-gray-900">Designers</h1>
        <p className="text-lg text-gray-600">Découvrez les {designers.length} designers de notre collection</p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Rechercher un designer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-center">
        <Badge variant="secondary" className="text-sm">
          <Users className="w-4 h-4 mr-1" />
          {filteredDesigners.length} designer{filteredDesigners.length > 1 ? "s" : ""} trouvé
          {filteredDesigners.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentDesigners.map((designer) => (
          <Link key={designer.slug} href={`/designers/${encodeURIComponent(designer.nom)}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="aspect-square relative mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  {designer.image ? (
                    <Image
                      src={designer.image || "/placeholder.svg"}
                      alt={designer.nom}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">{designer.nom}</h3>
                  <Badge variant="outline" className="text-xs">
                    {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center space-x-2 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Précédent</span>
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center space-x-2 bg-transparent"
          >
            <span>Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* No results */}
      {filteredDesigners.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun designer trouvé</h3>
          <p className="text-gray-600">Essayez de modifier votre recherche</p>
        </div>
      )}
    </div>
  )
}
