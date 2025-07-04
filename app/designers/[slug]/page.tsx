"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([])
  const [description, setDescription] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { userData } = useAuth()
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    if (!params.slug) return

    const designerSlug = decodeURIComponent(params.slug as string)
    console.log("🔍 Designer slug:", designerSlug)

    async function fetchDesignerData() {
      setIsLoading(true)
      try {
        // Utiliser l'API designer spécifique
        const response = await fetch(`/api/designers/${encodeURIComponent(designerSlug)}`)
        const result = await response.json()
        console.log("📊 Réponse API designer:", result)

        if (result.success) {
          setDesigner(result.data.designer)
          // CORRECTION 2: Récupérer l'image du designer depuis les luminaires
          const designerImageFilename = result.data.luminaires.find(
            (lum: any) => lum.designerImageFilename,
          )?.designerImageFilename

          // Adapter les données des luminaires pour GalleryGrid
          const adaptedLuminaires = result.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.filename ? `/api/images/filename/${lum.filename}` : null,
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum.annee || lum["Année"] || "",
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            specialty: lum["Spécialité"] || lum.periode || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.description || "",
          }))

          setDesignerLuminaires(adaptedLuminaires)
          console.log("✅ Luminaires adaptés:", adaptedLuminaires.length)

          // CORRECTION 2: Mettre à jour les données du designer avec l'image trouvée
          if (designerImageFilename) {
            setDesigner((prev) => ({
              ...prev,
              imagedesigner: designerImageFilename,
            }))
            console.log("✅ Image designer trouvée:", designerImageFilename)
          }

          // Charger les descriptions stockées localement
          if (adaptedLuminaires.length > 0) {
            const fullDesignerField = adaptedLuminaires[0].artist
            const defaultSpecialty = adaptedLuminaires[0].specialty

            // Récupérer toutes les collaborations/œuvres uniques pour ce designer
            const allCollaborations = adaptedLuminaires
              .map((lum) => lum.collaboration)
              .filter((collab) => collab && collab.trim() !== "")
              .filter((value, index, self) => self.indexOf(value) === index) // Supprimer les doublons
              .join(" • ")

            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}")
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}")

            setDescription(storedDescriptions[fullDesignerField] || defaultSpecialty)
            setCollaboration(storedCollaborations[fullDesignerField] || allCollaborations)
          }
        } else {
          console.error("❌ Erreur API:", result.error)
          setDesigner(null)
        }
      } catch (error) {
        console.error("❌ Erreur chargement données designer:", error)
        setDesigner(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDesignerData()
  }, [params.slug])

  // Fonctions pour mettre à jour les descriptions (seulement pour admin)
  const updateDescription = (newDescription: string) => {
    if (!canEdit) return
    setDescription(newDescription)
    if (designerLuminaires.length > 0) {
      const fullDesignerField = designerLuminaires[0].artist
      const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}")
      storedDescriptions[fullDesignerField] = newDescription
      localStorage.setItem("designer-descriptions", JSON.stringify(storedDescriptions))
    }
  }

  const updateCollaboration = (newCollaboration: string) => {
    if (!canEdit) return
    setCollaboration(newCollaboration)
    if (designerLuminaires.length > 0) {
      const fullDesignerField = designerLuminaires[0].artist
      const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}")
      storedCollaborations[fullDesignerField] = newCollaboration
      localStorage.setItem("designer-collaborations", JSON.stringify(storedCollaborations))
    }
  }

  const updateLuminaire = (id: string, updates: any) => {
    if (!canEdit) return
    setDesignerLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
  }

  if (isLoading) {
    return <div className="text-center py-8 font-serif">Chargement...</div>
  }

  if (!designer) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="font-serif">Designer non trouvé.</p>
        <Link href="/designers">
          <Button className="mt-4">Retour</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/designers">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent font-serif">
              <ArrowLeft className="w-4 h-4" />
              Retour aux designers
            </Button>
          </Link>
        </div>

        {!canEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-serif">
              Mode lecture seule. Seuls les administrateurs peuvent modifier les informations.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-48 h-48 relative flex-shrink-0">
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden">
                {designer.imagedesigner ? (
                  <Image
                    src={`/api/images/filename/${designer.imagedesigner}`}
                    alt={designer.nom}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      console.log("❌ Erreur chargement image designer:", designer.imagedesigner)
                      e.currentTarget.style.display = "none"
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                      if (nextElement) {
                        nextElement.classList.remove("hidden")
                      }
                    }}
                  />
                ) : null}
                <div className={`text-center ${designer.imagedesigner ? "hidden" : ""}`}>
                  <div className="text-6xl text-gray-400 mb-2">👤</div>
                  <span className="text-sm text-gray-500 font-serif">Image non disponible</span>
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-serif text-gray-900 mb-4">{designer.nom}</h1>
              <p className="text-lg text-gray-600 mb-6 font-serif">
                {designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection
              </p>

              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2 font-serif">Spécialité</h3>
                <EditableField value={description} onSave={updateDescription} multiline disabled={!canEdit} />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2 font-serif">Collaboration / Œuvre</h3>
                <EditableField value={collaboration} onSave={updateCollaboration} multiline disabled={!canEdit} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Luminaires de {designer.nom}</h2>
          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
          ) : (
            <div className="text-center py-12">
              <p className="font-serif">Aucun luminaire trouvé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
