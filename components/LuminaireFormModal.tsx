"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function LuminaireFormModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    editeur: "",
    annee: "",
    dimensions: "",
    estimation: "",
    collaboration: "",
    description: "",
    materiaux: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [designerImageFile, setDesignerImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nom) {
      toast.error("Le nom du luminaire est obligatoire.")
      return
    }

    setUploading(true)

    try {
      // Étape 1: Créer le document luminaire
      const luminaireData = {
        "Nom luminaire": formData.nom,
        "Artiste / Dates": formData.designer,
        Editeur: formData.editeur,
        Année: formData.annee ? Number.parseInt(formData.annee) : null,
        Dimensions: formData.dimensions,
        Estimation: formData.estimation,
        "Collaboration / Œuvre": formData.collaboration,
        Description: formData.description,
        Matériaux: formData.materiaux,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createResponse = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(luminaireData),
      })

      const createResult = await createResponse.json()
      if (!createResult.success) throw new Error(createResult.error || "Erreur lors de la création")

      const luminaireId = createResult.id

      // Étape 2: Upload de l'image du luminaire (si présente)
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append("image", imageFile)
        imageFormData.append("luminaireId", luminaireId)

        const imageResponse = await fetch("/api/luminaires/associate-image", {
          method: "POST",
          body: imageFormData,
        })

        const imageResult = await imageResponse.json()
        if (!imageResult.success) {
          console.warn("Avertissement: Échec de l'upload de l'image du luminaire:", imageResult.error)
        }
      }

      // Étape 3: Upload de l'image du designer (si présente)
      if (designerImageFile) {
        const designerImageFormData = new FormData()
        designerImageFormData.append("image", designerImageFile)
        designerImageFormData.append("luminaireId", luminaireId)

        const designerImageResponse = await fetch("/api/luminaires/associate-designer-image", {
          method: "POST",
          body: designerImageFormData,
        })

        const designerImageResult = await designerImageResponse.json()
        if (!designerImageResult.success) {
          console.warn("Avertissement: Échec de l'upload de l'image du designer:", designerImageResult.error)
        }
      }

      toast.success("Luminaire créé avec succès !")
      onSuccess()
      onClose()

      // Réinitialiser le formulaire
      setFormData({
        nom: "",
        designer: "",
        editeur: "",
        annee: "",
        dimensions: "",
        estimation: "",
        collaboration: "",
        description: "",
        materiaux: "",
      })
      setImageFile(null)
      setDesignerImageFile(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un luminaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
          <div>
            <Label htmlFor="nom">Nom du luminaire *</Label>
            <Input
              id="nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              placeholder="Nom du luminaire"
            />
          </div>

          <div>
            <Label htmlFor="designer">Artiste / Dates</Label>
            <Input
              id="designer"
              name="designer"
              value={formData.designer}
              onChange={handleChange}
              placeholder="Nom de l'artiste et dates"
            />
          </div>

          <div>
            <Label htmlFor="editeur">Editeur</Label>
            <Input
              id="editeur"
              name="editeur"
              value={formData.editeur}
              onChange={handleChange}
              placeholder="Nom de l'éditeur"
            />
          </div>

          <div>
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              name="annee"
              type="number"
              value={formData.annee}
              onChange={handleChange}
              placeholder="Année de création"
            />
          </div>

          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              name="dimensions"
              value={formData.dimensions}
              onChange={handleChange}
              placeholder="Dimensions du luminaire"
            />
          </div>

          <div>
            <Label htmlFor="estimation">Estimation</Label>
            <Input
              id="estimation"
              name="estimation"
              value={formData.estimation}
              onChange={handleChange}
              placeholder="Estimation de prix"
            />
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              name="collaboration"
              value={formData.collaboration}
              onChange={handleChange}
              placeholder="Informations sur la collaboration ou l'œuvre"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description détaillée du luminaire"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="materiaux">Matériaux</Label>
            <Textarea
              id="materiaux"
              name="materiaux"
              value={formData.materiaux}
              onChange={handleChange}
              placeholder="Matériaux utilisés (séparer par des virgules)"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="image">Image du luminaire</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
            />
          </div>

          <div>
            <Label htmlFor="designerImage">Image du designer</Label>
            <Input
              id="designerImage"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setDesignerImageFile(e.target.files[0])}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Création..." : "Créer le luminaire"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
