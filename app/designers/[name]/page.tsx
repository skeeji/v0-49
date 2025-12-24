"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DesignerDetailPage() {
  const params = useParams()
  const designerName = decodeURIComponent(params.name as string)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [designer, setDesigner] = useState<any>(null)
  const [luminaires, setLuminaires] = useState<any[]>([])

  useEffect(() => {
    const fetchDesignerData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/designers/${encodeURIComponent(designerName)}`)
        const data = await response.json()

        if (data.success) {
          setDesigner(data.data.designer)
          setLuminaires(data.data.luminaires)
        } else {
          setError(data.error || "Designer non trouvé")
        }
      } catch (err: any) {
        console.error("Erreur chargement designer:", err)
        setError("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    if (designerName) {
      fetchDesignerData()
    }
  }, [designerName])

  if (loading) {
    return (
      <div className="container-responsive py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement du designer...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container-responsive py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error || "Designer non trouvé"}</p>
          <Link href="/designers">
            <Button className="bg-gold hover:bg-gold-dark text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux designers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <Link href="/designers">
        <Button variant="outline" className="mb-6 border-2 hover:border-gold hover:text-gold bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux designers
        </Button>
      </Link>

      <div className="bg-white rounded-xl p-8 border border-border mb-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0">
            {designer.image ? (
              <div className="w-32 h-32 relative">
                <Image
                  src={designer.image || "/placeholder.svg"}
                  alt={designer.nom}
                  fill
                  unoptimized
                  className="object-cover rounded-full border-4 border-gold/30"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center bg-beige rounded-full border-4 border-gold/30">
                <div className="text-center">
                  <div className="text-4xl text-gold mb-2">👤</div>
                  <span className="text-xs text-muted-foreground font-serif">Image manquante</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-4">{designer.nom}</h1>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-beige px-4 py-2 rounded-lg">
                <span className="text-sm text-muted-foreground">Luminaires</span>
                <p className="text-xl font-semibold text-gold">{designer.count}</p>
              </div>
            </div>

            {designer.biographie && (
              <div className="prose max-w-none">
                <p className="text-muted-foreground">{designer.biographie}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-serif text-foreground mb-4">Luminaires créés ({luminaires.length})</h2>
      </div>

      {luminaires.length === 0 ? (
        <div className="text-center py-16 bg-beige rounded-xl">
          <p className="text-foreground text-lg font-medium mb-2">Aucun luminaire trouvé</p>
          <p className="text-muted-foreground text-sm">Ce designer n'a pas encore de luminaires dans la collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {luminaires.map((luminaire) => (
            <Link
              key={luminaire._id || luminaire.id}
              href={`/luminaires/${luminaire._id || luminaire.id}`}
              className="group"
            >
              <div className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-gold transition-all">
                <div className="aspect-square relative bg-cream">
                  {luminaire.image ? (
                    <Image
                      src={luminaire.image || "/placeholder.svg"}
                      alt={luminaire.name || "Luminaire"}
                      fill
                      unoptimized
                      className="object-contain p-4 group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Image manquante</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                    {luminaire.name || luminaire["Nom luminaire"] || "Sans nom"}
                  </h3>
                  {luminaire.year && <p className="text-xs text-muted-foreground">{luminaire.year}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
