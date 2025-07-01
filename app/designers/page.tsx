"use client"
import { useState, useEffect } from "react"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, MapPin, ExternalLink } from "lucide-react"
import Link from "next/link"
import { CSVExportButton } from "@/components/CSVExportButton"

interface Designer {
  _id: string
  nom: string
  prenom?: string
  dateNaissance?: string
  dateDeces?: string
  nationalite?: string
  biographie?: string
  luminairesCount?: number
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom")

  useEffect(() => {
    fetchDesigners()
  }, [])

  useEffect(() => {
    filterAndSortDesigners()
  }, [designers, searchTerm, sortBy])

  const fetchDesigners = async () => {
    try {
      const response = await fetch("/api/designers")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDesigners(data.designers)
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des designers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortDesigners = () => {
    let filtered = [...designers]

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (designer) =>
          designer.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          designer.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          designer.nationalite?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          designer.biographie?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          return (a.nom || "").localeCompare(b.nom || "")
        case "prenom":
          return (a.prenom || "").localeCompare(b.prenom || "")
        case "nationalite":
          return (a.nationalite || "").localeCompare(b.nationalite || "")
        case "dateNaissance":
          return (a.dateNaissance || "").localeCompare(b.dateNaissance || "")
        default:
          return 0
      }
    })

    setFilteredDesigners(filtered)
  }

  const formatDateRange = (naissance?: string, deces?: string) => {
    if (!naissance && !deces) return ""
    if (naissance && deces) return `${naissance} - ${deces}`
    if (naissance) return `Né en ${naissance}`
    return `Décédé en ${deces}`
  }

  const createSlug = (nom: string, prenom?: string) => {
    const fullName = prenom ? `${prenom} ${nom}` : nom
    return fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 mx-auto mb-4"
              style={{ borderTopColor: "#d4a574" }}
            ></div>
            <p className="text-gray-600">Chargement des designers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2">Designers</h1>
          <p className="text-gray-600">{filteredDesigners.length} designers trouvés</p>
        </div>
        <CSVExportButton data={filteredDesigners} filename="designers" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
        <div></div>
        <SortSelector
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: "nom", label: "Nom" },
            { value: "prenom", label: "Prénom" },
            { value: "nationalite", label: "Nationalité" },
            { value: "dateNaissance", label: "Date de naissance" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDesigners.map((designer) => (
          <Card key={designer._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-lg">
                    {designer.prenom} {designer.nom}
                  </span>
                </div>
                <Link href={`/designers/${createSlug(designer.nom, designer.prenom)}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                    style={{ color: "#d4a574" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#c19660")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#d4a574")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(designer.dateNaissance || designer.dateDeces) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateRange(designer.dateNaissance, designer.dateDeces)}</span>
                </div>
              )}

              {designer.nationalite && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{designer.nationalite}</span>
                </div>
              )}

              {designer.luminairesCount !== undefined && (
                <Badge variant="secondary" className="text-white" style={{ backgroundColor: "#d4a574" }}>
                  {designer.luminairesCount} luminaire{designer.luminairesCount > 1 ? "s" : ""}
                </Badge>
              )}

              {designer.biographie && <p className="text-sm text-gray-600 line-clamp-3">{designer.biographie}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDesigners.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun designer trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos critères de recherche.</p>
        </div>
      )}
    </div>
  )
}
