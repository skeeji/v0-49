"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { GalleryGrid } from "@/components/GalleryGrid"

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState([])
  const [description, setDescription] = useState("")
  // Ajouter un nouvel état pour stocker la valeur de collaboration/œuvre
  const [collaboration, setCollaboration] = useState("")

  useEffect(() => {
    const designerName = decodeURIComponent(params.slug as string)

    // Charger les données du designer
    const storedLuminaires = localStorage.getItem("luminaires")
    const storedDesigners = localStorage.getItem("designers")
    const storedDescriptions = localStorage.getItem("designer-descriptions")

    if (storedLuminaires) {
      const luminaires = JSON.parse(storedLuminaires)
      const importedDesigners = storedDesigners ? JSON.parse(storedDesigners) : []
      const descriptions = storedDescriptions ? JSON.parse(storedDescriptions) : {}

      // Trouver le designer importé
      const importedDesigner = importedDesigners.find((d: any) => {
        const designerNameLower = d.name?.toLowerCase().trim()
        const searchNameLower = designerName.toLowerCase().trim()
        return (
          designerNameLower === searchNameLower ||
          searchNameLower.includes(designerNameLower) ||
          designerNameLower.includes(searchNameLower)
        )
      })

      // Trouver les luminaires du designer
      const designerLuminaires = luminaires.filter((luminaire: any) => luminaire.artist === designerName)

      // Utiliser la spécialité du premier luminaire trouvé comme description par défaut
      const defaultSpecialty = designerLuminaires.length > 0 ? designerLuminaires[0].specialty || "" : ""

      setDesigner({
        name: designerName,
        image: importedDesigner?.image || "",
        specialty: defaultSpecialty,
        count: designerLuminaires.length,
      })

      setDesignerLuminaires(designerLuminaires)
      setDescription(descriptions[designerName] || defaultSpecialty)
      // Dans le useEffect, après le chargement des données du designer, ajouter :
      // Après cette ligne : setDescription(descriptions[designerName] || defaultSpecialty)
      // Ajouter :
      const storedCollaborations = localStorage.getItem("designer-collaborations")
      const collaborations = storedCollaborations ? JSON.parse(storedCollaborations) : {}
      setCollaboration(collaborations[designerName] || "")
    }
  }, [params.slug])

  const updateDescription = (newDescription: string) => {
    const storedDescriptions = localStorage.getItem("designer-descriptions")
    const descriptions = storedDescriptions ? JSON.parse(storedDescriptions) : {}
    descriptions[designer.name] = newDescription
    localStorage.setItem("designer-descriptions", JSON.stringify(descriptions))
    setDescription(newDescription)
  }

  // Ajouter une fonction pour mettre à jour la collaboration
  const updateCollaboration = (newCollaboration: string) => {
    const storedCollaborations = localStorage.getItem("designer-collaborations")
    const collaborations = storedCollaborations ? JSON.parse(storedCollaborations) : {}
    collaborations[designer.name] = newCollaboration
    localStorage.setItem("designer-collaborations", JSON.stringify(collaborations))
    setCollaboration(newCollaboration)
  }

  const updateLuminaire = (id: string, updates: any) => {
    const storedLuminaires = localStorage.getItem("luminaires")
    if (storedLuminaires) {
      const luminaires = JSON.parse(storedLuminaires)
      const updated = luminaires.map((item: any) => (item.id === id ? { ...item, ...updates } : item))
      localStorage.setItem("luminaires", JSON.stringify(updated))

      // Mettre à jour l'état local
      setDesignerLuminaires(updated.filter((luminaire: any) => luminaire.artist === designer.name))
    }
  }

  if (!designer) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center">
          <p className="text-lg text-gray-600">Designer non trouvé</p>
          <Link href="/designers">
            <Button className="mt-4">Retour aux designers</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/designers">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour aux designers
            </Button>
          </Link>
        </div>

        {/* En-tête du designer */}
        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Photo du designer */}
            <div className="w-48 h-48 relative flex-shrink-0">
              {designer.image ? (
                <Image
                  src={designer.image || "/placeholder.svg"}
                  alt={designer.name}
                  fill
                  className="object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200">
                  <div className="text-center">
                    <div className="text-6xl text-gray-400 mb-2">👤</div>
                    <span className="text-sm text-gray-500">Image manquante</span>
                  </div>
                </div>
              )}
            </div>

            {/* Informations du designer */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-playfair text-dark mb-4">{designer.name}</h1>

              <p className="text-lg text-gray-600 mb-6">
                {designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection
              </p>

              {/* Spécialité/Description éditable */}
              <div className="bg-cream rounded-lg p-4">
                <h3 className="text-lg font-medium text-dark mb-2">Spécialité</h3>
                <EditableField
                  value={description}
                  onSave={updateDescription}
                  placeholder="Spécialité du designer..."
                  multiline
                  className="text-gray-700 leading-relaxed"
                />
              </div>
              {/* Dans le JSX, après le bloc de spécialité, ajouter le bloc de collaboration/œuvre
              // Après cette div :
              // <div className="bg-cream rounded-lg p-4">
              //   <h3 className="text-lg font-medium text-dark mb-2">Spécialité</h3>
              //   <EditableField
              //     value={description}
              //     onSave={updateDescription}
              //     placeholder="Spécialité du designer..."
              //     multiline
              //     className="text-gray-700 leading-relaxed"
              //   />
              // </div>

              // Ajouter : */}
              <div className="bg-cream rounded-lg p-4 mt-4">
                <h3 className="text-lg font-medium text-dark mb-2">Collaboration / Œuvre</h3>
                <EditableField
                  value={collaboration}
                  onSave={updateCollaboration}
                  placeholder="Collaboration ou œuvre notable..."
                  multiline
                  className="text-gray-700 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Luminaires du designer */}
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-playfair text-dark mb-6">Luminaires de {designer.name}</h2>

          {designerLuminaires.length > 0 ? (
            <GalleryGrid items={designerLuminaires} viewMode="grid" onItemUpdate={updateLuminaire} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun luminaire trouvé pour ce designer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
