"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import { toast } from "sonner"

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([])
  const [description, setDescription] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { userData } = useAuth()
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    if (!params.slug) return

    const designerSlug = decodeURIComponent(params.slug as string)
    console.log("🔍 Designer slug:", designerSlug)

    async function fetchDesignerData() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/designers/${encodeURIComponent(designerSlug)}`)
        const result = await response.json()
        console.log("📊 Réponse API designer:", result)

        if (result.success) {
          setDesigner(result.data.designer)

          const designerImageFilename = result.data.luminaires.find(
            (lum: any) => lum.designerImageFilename,
          )?.designerImageFilename

          const adaptedLuminaires = result.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.filename ? `/api/images/filename/${lum.filename}` : null,
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum.annee || lum["Année"] || "",
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            specialty: lum["Spécialité"] || lum.periode || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
            editeur: lum.editeur || lum.Editeur || "",
          }))

          setDesignerLuminaires(adaptedLuminaires)
          console.log("✅ Luminaires adaptés:", adaptedLuminaires.length)

          if (designerImageFilename) {
            setDesigner((prev) => ({
              ...prev,
              imagedesigner: designerImageFilename,
            }))
            console.log("✅ Image designer trouvée:", designerImageFilename)
          }

          if (adaptedLuminaires.length > 0) {
            const fullDesignerField = adaptedLuminaires[0].artist
            const defaultSpecialty = adaptedLuminaires[0].specialty

            // Récupérer les collaborations ET les éditeurs
            const allCollaborations = adaptedLuminaires
              .map((lum) => lum["Collaboration / Œuvre"] || lum.collaboration || "")
              .filter((collab) => collab && collab.trim() !== "")
              .filter((value, index, self) => self.indexOf(value) === index)

            const allEditeurs = adaptedLuminaires
              .map((lum) => lum.editeur || lum.Editeur || "")
              .filter((editeur) => editeur && editeur.trim() !== "")
              .filter((value, index, self) => self.indexOf(value) === index)

            // Combiner collaborations et éditeurs sans doublons
            const combinedInfo = [...allCollaborations, ...allEditeurs]
              .filter((value, index, self) => self.indexOf(value) === index)
              .join(" • ")

            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}")
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}")

            const finalDescription = storedDescriptions[fullDesignerField] || defaultSpecialty
            const finalCollaboration = storedCollaborations[fullDesignerField] || combinedInfo || ""

            setDescription(finalDescription)
            setCollaboration(finalCollaboration)
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

  const updateDesignerName = async (newName: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "Artiste / Dates": newName,
            designer: newName,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)

      setDesigner((prev) => ({ ...prev, nom: newName }))
      setDesignerLuminaires((prev) => prev.map((lum) => ({ ...lum, artist: newName })))

      console.log("✅ Nom du designer mis à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour nom designer:", error)
    }
  }

  const updateDesignerSpecialty = async (newSpecialty: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Spécialité: newSpecialty,
            periode: newSpecialty,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)
      updateDescription(newSpecialty)

      console.log("✅ Spécialité du designer mise à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour spécialité designer:", error)
    }
  }

  const updateDesignerCollaboration = async (newCollaboration: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "Collaboration / Œuvre": newCollaboration,
            collaboration: newCollaboration,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)
      updateCollaboration(newCollaboration)

      console.log("✅ Collaboration du designer mise à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour collaboration designer:", error)
    }
  }

  const updateLuminaire = (id: string, updates: any) => {
    if (!canEdit) return
    setDesignerLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
  }

  const handleCreateLuminaire = async (luminaireData: any) => {
    try {
      console.log("📝 Création du luminaire:", luminaireData)

      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(luminaireData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Luminaire créé avec succès!")
        // Recharger les luminaires du designer
        const designerSlug = decodeURIComponent(params.slug as string)
        const refreshResponse = await fetch(`/api/designers/${encodeURIComponent(designerSlug)}`)
        const refreshResult = await refreshResponse.json()

        if (refreshResult.success) {
          const adaptedLuminaires = refreshResult.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.filename ? `/api/images/filename/${lum.filename}` : null,
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum.annee || lum["Année"] || "",
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            specialty: lum["Spécialité"] || lum.periode || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
          }))
          setDesignerLuminaires(adaptedLuminaires)
          setDesigner((prev) => ({ ...prev, count: adaptedLuminaires.length }))
        }

        return result
      } else {
        throw new Error(result.error || "Erreur lors de la création")
      }
    } catch (error: any) {
      console.error("❌ Erreur création luminaire:", error)
      toast.error(`Erreur: ${error.message}`)
      return { success: false, error: error.message }
    }
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

  const defaultFormValues = {
    designer: designer.nom || "",
    periode: description || "",
    collaboration: collaboration || "",
    designerImageFilename: designer.imagedesigner || "",
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
              <EditableField
                value={designer.nom}
                onSave={(newName) => {
                  if (!canEdit) return
                  updateDesignerName(newName)
                }}
                className="text-4xl font-serif text-gray-900 mb-4"
                placeholder="Nom du designer"
                disabled={!canEdit}
              />
              <p className="text-lg text-gray-600 mb-6 font-serif">
                {designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection
              </p>

              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2 font-serif">Spécialité</h3>
                <EditableField value={description} onSave={updateDesignerSpecialty} multiline disabled={!canEdit} />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2 font-serif">Collaboration / Œuvre / Éditeur</h3>
                <EditableField
                  value={collaboration}
                  onSave={updateDesignerCollaboration}
                  multiline
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-gray-900">Luminaires de {designer.nom}</h2>
            {canEdit && (
              <Button
                onClick={() => setIsModalOpen(true)}
                style={{ backgroundColor: "#f2d895", color: "#000" }}
                className="hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau luminaire
              </Button>
            )}
          </div>

          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
          ) : (
            <div className="text-center py-12">
              <p className="font-serif">Aucun luminaire trouvé.</p>
            </div>
          )}
        </div>
      </div>

      <LuminaireFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateLuminaire}
        defaultValues={defaultFormValues}
      />
    </div>
  )
}
