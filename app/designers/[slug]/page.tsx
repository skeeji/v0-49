"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
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
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/designers" className="p-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-serif text-gray-900 font-medium">{designer?.nom}</h1>
          <button className="p-2">
            <Search className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Desktop back button */}
          <div className="hidden md:block mb-8">
            <Link href="/designers">
              <Button variant="outline" className="flex items-center gap-2 bg-white">
                <ArrowLeft className="w-4 h-4" />
                Retour aux designers
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8">
            {/* Portrait and info in horizontal layout on mobile */}
            <div className="flex items-start gap-6 mb-6">
              {/* Portrait image */}
              <div className="w-20 h-20 relative flex-shrink-0">
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                  {designer.imagedesigner ? (
                    <Image
                      src={`/api/images/filename/${designer.imagedesigner}`}
                      alt={designer.nom}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                        if (nextElement) {
                          nextElement.classList.remove("hidden")
                        }
                      }}
                    />
                  ) : null}
                  <div className={`text-center ${designer.imagedesigner ? "hidden" : ""}`}>
                    <div className="text-4xl text-gray-400">👤</div>
                  </div>
                </div>
              </div>

              {/* Designer info */}
              <div className="flex-1">
                <EditableField
                  value={designer.nom}
                  onSave={(newName) => {
                    if (!canEdit) return
                    updateDesignerName(newName)
                  }}
                  className="text-xl md:text-2xl font-serif text-gray-900 mb-1"
                  placeholder="Nom du designer"
                  disabled={!canEdit}
                />
                <p className="text-sm text-gray-600 mb-2">
                  {description?.match(/\d{4}/g)?.join("-") || "Période inconnue"}
                </p>
                <p className="text-xs text-gray-500">{designer.count} Luminaires & Pièces de Décoration</p>
              </div>
            </div>

            {/* Biography section */}
            {description && (
              <div className="mb-6 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-serif font-medium text-gray-900 mb-3">Biographie</h3>
                <EditableField
                  value={description}
                  onSave={updateDesignerSpecialty}
                  multiline
                  disabled={!canEdit}
                  className="text-sm text-gray-700 leading-relaxed"
                />
              </div>
            )}

            {/* Philosophy section */}
            {collaboration && (
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-serif font-medium text-gray-900 mb-3">Philosophie</h3>
                <EditableField
                  value={collaboration}
                  onSave={updateDesignerCollaboration}
                  multiline
                  disabled={!canEdit}
                  className="text-sm text-gray-700 leading-relaxed italic"
                />
              </div>
            )}
          </div>

          {/* Iconic Pieces section */}
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-medium text-gray-900">Pièces Iconiques</h2>
              <button className="text-sm text-gray-600 hover:text-gray-900">Voir tout ({designer.count})</button>
            </div>

            {designerLuminaires.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {designerLuminaires.slice(0, 4).map((luminaire) => (
                  <Link key={luminaire.id} href={`/luminaires/${luminaire.id}`} className="block">
                    <div className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square relative">
                        {luminaire.image ? (
                          <Image
                            src={luminaire.image || "/placeholder.svg"}
                            alt={luminaire.name}
                            fill
                            className="object-contain p-4"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-4xl">🏮</div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 text-center">
                        <h3 className="font-serif text-sm font-medium text-gray-900 mb-1">{luminaire.name}</h3>
                        <p className="text-xs text-gray-600">
                          {luminaire.editeur || "Artisan"}
                          {luminaire.year && `, ${luminaire.year}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="font-serif text-gray-500">Aucun luminaire trouvé.</p>
              </div>
            )}

            {/* View Full Collection button */}
            <button className="w-full py-3 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Voir la collection complète
            </button>
          </div>

          {canEdit && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau luminaire
            </Button>
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
