"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Designer {
  _id: string
  nom: string
  "Dates de naissance et mort": string
  Nationalite?: string
  photo?: string
  luminaires?: any[]
}

export default function DesignerPage() {
  const params = useParams()
  const router = useRouter()
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const designerName = decodeURIComponent(params.name as string)

  useEffect(() => {
    const loadDesigner = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/designers/${encodeURIComponent(designerName)}`)
        const data = await response.json()

        if (data.success) {
          setDesigner(data.designer)
        } else {
          throw new Error(data.error || "Designer non trouvé")
        }
      } catch (err: any) {
        console.error("Erreur chargement designer:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDesigner()
  }, [designerName])

  if (loading) {
    return (
      <div className="container-responsive py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container-responsive py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Designer non trouvé"}</p>
          <Button onClick={() => router.push("/designers")} className="bg-gold hover:bg-gold-dark text-white">
            Retour aux designers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      {/* Bouton retour */}
      <Link
        href="/designers"
        className="inline-flex items-center gap-2 text-gold hover:text-gold-dark transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Retour aux designers</span>
      </Link>

      {/* En-tête avec photo et infos */}
      <div className="bg-white rounded-2xl border border-border p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Photo du designer */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-gold">
              {designer.photo ? (
                <Image
                  src={designer.photo || "/placeholder.svg"}
                  alt={designer.nom}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 128px, 160px"
                />
              ) : (
                <div className="w-full h-full bg-beige flex items-center justify-center">
                  <span className="text-4xl font-serif text-gold">{designer.nom.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">{designer.nom}</h1>

            <div className="space-y-2 text-muted-foreground">
              {designer["Dates de naissance et mort"] && (
                <p className="flex items-center gap-2">
                  <span className="text-gold">📅</span>
                  <span>{designer["Dates de naissance et mort"]}</span>
                </p>
              )}

              {designer.Nationalite && (
                <p className="flex items-center gap-2">
                  <span className="text-gold">🌍</span>
                  <span>{designer.Nationalite}</span>
                </p>
              )}

              <p className="flex items-center gap-2">
                <span className="text-gold">💡</span>
                <span className="font-medium">
                  {designer.luminaires?.length || 0} luminaire{(designer.luminaires?.length || 0) > 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des luminaires */}
      {designer.luminaires && designer.luminaires.length > 0 ? (
        <div>
          <h2 className="text-2xl font-serif text-foreground mb-6">Luminaires créés</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {designer.luminaires.map((luminaire) => (
              <Link
                key={luminaire._id}
                href={`/luminaires/${luminaire._id}`}
                className="group card-luminaire hover:scale-105 transition-all duration-300"
              >
                <div className="aspect-square relative bg-beige">
                  {luminaire.image_principale ? (
                    <Image
                      src={luminaire.image_principale || "/placeholder.svg"}
                      alt={luminaire.nom || "Luminaire"}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span>Pas d'image</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-foreground group-hover:text-gold transition-colors line-clamp-2">
                    {luminaire.nom || "Sans nom"}
                  </h3>
                  {luminaire.annee && <p className="text-sm text-muted-foreground mt-1">{luminaire.annee}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-beige rounded-xl">
          <p className="text-foreground text-lg font-medium mb-2">Aucun luminaire trouvé</p>
          <p className="text-muted-foreground text-sm">Ce designer n'a pas encore de luminaires dans la collection</p>
        </div>
      )}
    </div>
  )
}
