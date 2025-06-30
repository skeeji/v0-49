"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { GalleryGrid } from "@/components/GalleryGrid"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  _id: string
  nom: string
  imagedesigner?: string
  luminaires: any[]
  totalLuminaires: number
}

export default function DesignerPage() {
  const params = useParams()
  const slug = params.slug as string
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDesigner() {
      if (!slug) return

      setLoading(true)
      setError(null)

      try {
        console.log("🔍 Chargement designer:", slug)
        const response = await fetch(`/api/designers/${encodeURIComponent(slug)}`)
        const data = await response.json()

        console.log("📊 Réponse API designer:", data)

        if (data.success) {
          setDesigner(data.designer)
          console.log(`✅ Designer chargé: ${data.designer.nom} avec ${data.designer.totalLuminaires} luminaires`)
        } else {
          console.log("❌ Erreur API:", data.error)
          setError(data.error || "Designer non trouvé")
        }
      } catch (err: any) {
        console.error("❌ Erreur réseau:", err)
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }

    fetchDesigner()
  }, [slug])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du designer...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Link href="/designers">
            <Button>Retour aux designers</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Bouton retour */}
      <div className="mb-8">
        <Link href="/designers">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Retour aux designers
          </Button>
        </Link>
      </div>

      {/* En-tête du designer */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Image du designer */}
          <div className="flex-shrink-0">
            <div className="w-48 h-48 relative overflow-hidden rounded-lg bg-gray-100">
              {designer.imagedesigner ? (
                <Image
                  src={`/api/images/filename/${designer.imagedesigner}`}
                  alt={designer.nom}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Informations du designer */}
          <div className="flex-1">
            <h1 className="text-4xl font-serif text-gray-900 mb-4">{designer.nom}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="text-lg">
                {designer.totalLuminaires} luminaire{designer.totalLuminaires > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Luminaires du designer */}
      {designer.luminaires && designer.luminaires.length > 0 ? (
        <div>
          <h2 className="text-2xl font-serif text-gray-900 mb-6">
            Luminaires de {designer.nom} ({designer.totalLuminaires})
          </h2>
          <GalleryGrid items={designer.luminaires} viewMode="grid" columns={4} />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun luminaire trouvé pour ce designer</p>
        </div>
      )}
    </div>
  )
}
