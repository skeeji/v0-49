"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DesignerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [designer, setDesigner] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDesigner() {
      try {
        const designerName = decodeURIComponent(params.name as string)

        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        if (data.success) {
          const designerLuminaires = data.luminaires.filter((luminaire: any) => {
            const artistName = luminaire["Artiste / Dates"] || luminaire.designer || ""
            return artistName.toLowerCase().trim() === designerName.toLowerCase().trim()
          })

          if (designerLuminaires.length > 0) {
            const firstLuminaire = designerLuminaires[0]
            const designerImageUrl = firstLuminaire.designerImageFilename
              ? `/api/images/filename/${firstLuminaire.designerImageFilename}`
              : ""

            setDesigner({
              name: designerName,
              image: designerImageUrl,
              count: designerLuminaires.length,
              luminaires: designerLuminaires.map((l: any) => ({
                _id: l._id,
                name: l["Nom luminaire"] || l.nom || "Sans nom",
                image: l.imageId
                  ? `/api/images/${l.imageId}`
                  : l.filename
                    ? `/api/images/filename/${l.filename}`
                    : l["Nom du fichier"]
                      ? `/api/images/filename/${l["Nom du fichier"]}`
                      : "/placeholder.svg",
                year: l.annee || l.year || "",
              })),
            })
          }
        }
      } catch (error) {
        console.error("Erreur chargement designer:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.name) {
      fetchDesigner()
    }
  }, [params.name])

  if (loading) {
    return (
      <div className="container-responsive py-12">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground font-serif">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!designer) {
    return (
      <div className="container-responsive py-12">
        <div className="text-center py-16">
          <p className="text-lg text-foreground mb-4">Designer non trouvé</p>
          <Button onClick={() => router.push("/designers")} className="bg-gold hover:bg-gold-dark text-white">
            Retour aux designers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => router.push("/designers")}
          variant="outline"
          className="mb-6 border-2 hover:border-gold hover:text-gold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux designers
        </Button>

        <div className="bg-white rounded-xl p-8 border border-border shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 relative flex-shrink-0">
              {designer.image ? (
                <Image
                  src={designer.image || "/placeholder.svg"}
                  alt={designer.name}
                  fill
                  unoptimized
                  className="object-cover rounded-full border-4 border-gold/20"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-beige rounded-full border-4 border-gold/20">
                  <div className="text-center">
                    <div className="text-4xl text-gold mb-2">👤</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-4">{designer.name}</h1>
              <p className="text-lg text-muted-foreground">
                {designer.count} luminaire{designer.count > 1 ? "s" : ""} dans notre collection
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-serif text-foreground mb-4">Luminaires de {designer.name}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {designer.luminaires.map((luminaire: any) => (
            <Link key={luminaire._id} href={`/luminaires/${luminaire._id}`}>
              <div className="bg-white rounded-xl overflow-hidden border border-border transition-all hover:shadow-lg hover:border-gold cursor-pointer h-full">
                <div className="aspect-square relative bg-cream">
                  <Image
                    src={luminaire.image || "/placeholder.svg"}
                    alt={luminaire.name}
                    fill
                    unoptimized
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-serif text-foreground mb-1 line-clamp-2">{luminaire.name}</h3>
                  {luminaire.year && <p className="text-sm text-muted-foreground">{luminaire.year}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
