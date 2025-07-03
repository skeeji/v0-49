"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Luminaire {
  _id: string
  nom: string
  designer: string
  specialite?: string
  collaboration?: string
  description: string
  editeur?: string
  annee?: number
  signe?: string
  dimensions: string
  materiaux: string[]
  estimation: string
  image?: string
}

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")

export default function LuminaireDetailPage() {
  const { id } = useParams()
  const [luminaire, setLuminaire] = useState<Luminaire | null>(null)
  const [similar, setSimilar] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || typeof id !== "string") return
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/luminaires?id=${id}`) // Appel à l'API unifiée
        const data = await res.json()
        if (data.success) {
          setLuminaire(data.luminaire)
          setSimilar(data.similar || [])
        } else {
          throw new Error(data.error || "Luminaire non trouvé")
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">Erreur: {error}</div>
  }

  if (!luminaire) {
    return <div className="text-center py-10">Aucun luminaire trouvé.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/luminaires">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Retour à la galerie
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
          {luminaire.image ? (
            <Image
              src={luminaire.image || "/placeholder.svg"}
              alt={luminaire.nom}
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg"
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-gray-400 mb-2">🏮</div>
                <span className="text-sm text-gray-500">Image non disponible</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* AFFICHAGE DANS L'ORDRE DEMANDÉ */}
          <h1 className="text-4xl font-serif text-gray-900">{luminaire.nom}</h1>

          <div className="space-y-3">
            <p>
              <span className="font-semibold">Artiste / Dates : </span>
              <Link href={`/designers/${slugify(luminaire.designer)}`} className="text-blue-600 hover:underline">
                {luminaire.designer}
              </Link>
            </p>

            <p>
              <span className="font-semibold">Spécialité : </span>
              {luminaire.specialite || ""}
            </p>

            <p>
              <span className="font-semibold">Collaboration / Œuvre : </span>
              {luminaire.collaboration || ""}
            </p>

            <p>
              <span className="font-semibold">Description : </span>
              {luminaire.description || ""}
            </p>

            <p>
              <span className="font-semibold">Editeur : </span>
              {luminaire.editeur || ""}
            </p>

            <p>
              <span className="font-semibold">Année : </span>
              {luminaire.annee || ""}
            </p>

            <p>
              <span className="font-semibold">Signé : </span>
              {luminaire.signe || ""}
            </p>

            <p>
              <span className="font-semibold">Dimensions : </span>
              {luminaire.dimensions || ""}
            </p>

            <p>
              <span className="font-semibold">Matériaux : </span>
              {luminaire.materiaux.join(", ")}
            </p>

            <p>
              <span className="font-semibold">Estimation : </span>
              {luminaire.estimation || ""}
            </p>
          </div>
        </div>
      </div>

      {/* Section Luminaires Similaires */}
      {similar.length > 0 && (
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-serif text-center mb-8">Luminaires Similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {similar.map((item) => (
              <Link key={item._id} href={`/luminaires/${item._id}`} className="block group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.nom}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-2xl text-gray-400">🏮</div>
                    </div>
                  )}
                </div>
                <h3 className="mt-2 font-semibold text-sm truncate">{item.nom}</h3>
                <p className="text-xs text-gray-600 truncate">{item.designer}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
