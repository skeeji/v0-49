"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Upload } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  luminaire?: any
  mode: "create" | "edit"
}

export function LuminaireFormModal({ isOpen, onClose, onSuccess, luminaire, mode }: LuminaireFormModalProps) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // États pour les champs du formulaire
  const [nom, setNom] = useState("")
  const [designer, setDesigner] = useState("")
  const [annee, setAnnee] = useState("")
  const [editeur, setEditeur] = useState("")
  const [periode, setPeriode] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [description, setDescription] = useState("")
  const [signe, setSigne] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [estimation, setEstimation] = useState("")
  const [materiaux, setMateriaux] = useState<string[]>([])
  const [newMateriau, setNewMateriau] = useState("")

  // États pour les images
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [designerImageFile, setDesignerImageFile] = useState<File | null>(null)

  // Initialiser les champs en mode édition
  useEffect(() => {
    if (mode === "edit" && luminaire) {
      setNom(luminaire.nom || "")
      setDesigner(luminaire.designer || "")
      setAnnee(luminaire.annee || "")
      setEditeur(luminaire.editeur || "")
      setPeriode(luminaire.periode || "")
      setCollaboration(luminaire.collaboration || "")
      setDescription(luminaire.description || "")
      setSigne(luminaire.signe || "")
      setDimensions(luminaire.dimensions || "")
      setEstimation(luminaire.estimation || "")
      setMateriaux(Array.isArray(luminaire.materiaux) ? luminaire.materiaux : [])
    } else {
      // Réinitialiser en mode création
      setNom("")
      setDesigner("")
      setAnnee("")
      setEditeur("")
      setPeriode("")
      setCollaboration("")
      setDescription("")
      setSigne("")
      setDimensions("")
      setEstimation("")
      setMateriaux([])
      setSelectedFiles([])
      setDesignerImageFile(null)
    }
  }, [mode, luminaire, isOpen])

  const handleAddMateriau = () => {
    if (newMateriau.trim() && !materiaux.includes(newMateriau.trim())) {
      setMateriaux([...materiaux, newMateriau.trim()])
      setNewMateriau("")
    }
  }

  const handleRemoveMateriau = (index: number) => {
    setMateriaux(materiaux.filter((_, i) => i !== index))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleDesignerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDesignerImageFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // ÉTAPE 1 : Structure simple et standardisée des données
      const luminaireData = {
        nom,
        designer,
        annee,
        editeur,
        periode, // Pour "Spécialité"
        collaboration, // Pour "Collaboration / Œuvre"
        description,
        signe,
        dimensions,
        estimation,
        materiaux, // Reste un tableau JavaScript
      }

      let luminaireId = luminaire?._id

      if (mode === "create") {
        // Créer le luminaire
        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        })

        if (!response.ok) {
          throw new Error("Erreur lors de la création du luminaire")
        }

        const result = await response.json()
        luminaireId = result.luminaire._id
        showToast("Luminaire créé avec succès", "success")
      } else {
        // Modifier le luminaire
        const response = await fetch(`/api/luminaires/${luminaireId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        })

        if (!response.ok) {
          throw new Error("Erreur lors de la modification du luminaire")
        }

        showToast("Luminaire modifié avec succès", "success")
      }

      // Upload des images du luminaire
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        selectedFiles.forEach((file) => {
          formData.append("images", file)
        })

        const uploadResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()

          // Associer les images au luminaire
          await fetch("/api/luminaires/associate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              luminaireId,
              filenames: uploadResult.filenames,
            }),
          })
        }
      }

      // Upload de l'image du designer
      if (designerImageFile) {
        const designerFormData = new FormData()
        designerFormData.append("image", designerImageFile)

        const designerUploadResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: designerFormData,
        })

        if (designerUploadResponse.ok) {
          const designerUploadResult = await designerUploadResponse.json()

          // Associer l'image du designer au luminaire
          await fetch("/api/luminaires/associate-designer-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              luminaireId,
              filename: designerUploadResult.filenames[0],
            }),
          })
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erreur:", error)
      showToast("Erreur lors de l'opération", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Ajouter un luminaire" : "Modifier le luminaire"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom du luminaire</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="designer">Artiste / Dates</Label>
              <Input id="designer" value={designer} onChange={(e) => setDesigner(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="annee">Année</Label>
              <Input id="annee" value={annee} onChange={(e) => setAnnee(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="editeur">Éditeur</Label>
              <Input id="editeur" value={editeur} onChange={(e) => setEditeur(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periode">Spécialité</Label>
              <Input id="periode" value={periode} onChange={(e) => setPeriode(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Input id="collaboration" value={collaboration} onChange={(e) => setCollaboration(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signe">Signé</Label>
              <Input id="signe" value={signe} onChange={(e) => setSigne(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input id="dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="estimation">Estimation</Label>
            <Input id="estimation" value={estimation} onChange={(e) => setEstimation(e.target.value)} />
          </div>

          {/* Section Matériaux */}
          <div>
            <Label>Matériaux</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newMateriau}
                onChange={(e) => setNewMateriau(e.target.value)}
                placeholder="Ajouter un matériau"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMateriau())}
              />
              <Button type="button" onClick={handleAddMateriau} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {materiaux.map((materiau, index) => (
                <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  <span className="text-sm">{materiau}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMateriau(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upload d'images */}
          <div>
            <Label htmlFor="images">Images du luminaire</Label>
            <div className="flex items-center gap-2">
              <Input id="images" type="file" multiple accept="image/*" onChange={handleFileChange} className="flex-1" />
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{selectedFiles.length} fichier(s) sélectionné(s)</p>
            )}
          </div>

          {/* Upload image designer */}
          <div>
            <Label htmlFor="designerImage">Image du designer</Label>
            <div className="flex items-center gap-2">
              <Input
                id="designerImage"
                type="file"
                accept="image/*"
                onChange={handleDesignerImageChange}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            {designerImageFile && <p className="text-sm text-gray-500 mt-1">{designerImageFile.name}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "En cours..." : mode === "create" ? "Créer" : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
