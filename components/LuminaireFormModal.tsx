"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<any>
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    artist: "",
    annee: "",
    specialty: "",
    collaboration: "",
    description: "",
    signed: "",
    dimensions: "",
    materials: "",
    estimation: "",
    editeur: "",
  })
  const [luminaireImageFile, setLuminaireImageFile] = useState<File | null>(null)
  const [designerImageFile, setDesignerImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      // Étape 1: Créer le luminaire avec les données texte
      const luminaireData = {
        nom: formData.nom,
        designer: formData.artist,
        annee: formData.annee ? Number.parseInt(formData.annee) : null,
        periode: formData.specialty,
        description: formData.description,
        collaboration: formData.collaboration,
        signe: formData.signed,
        dimensions: formData.dimensions,
        materiaux: formData.materials
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        estimation: formData.estimation,
        editeur: formData.editeur,
        "Nom luminaire": formData.nom,
        "Artiste / Dates": formData.artist,
        Année: formData.annee,
        Spécialité: formData.specialty,
        "Collaboration / Œuvre": formData.collaboration,
        Signé: formData.signed,
      }

      console.log("📊 Création du luminaire (données texte)...", luminaireData)
      const createResponse = await onSubmit(luminaireData)

      if (!createResponse.success) {
        throw new Error(createResponse.error || "Erreur lors de la création du luminaire.")
      }

      const newLuminaireId = createResponse.id
      console.log("✅ Luminaire créé avec l'ID:", newLuminaireId)

      // Étape 2: Uploader l'image du luminaire si elle existe
      if (luminaireImageFile) {
        console.log(`🖼️ Upload de l'image du luminaire...`)
        const imageFormData = new FormData()
        imageFormData.append("image", luminaireImageFile)
        imageFormData.append("luminaireId", newLuminaireId)
        const assocResponse = await fetch("/api/luminaires/associate-image", {
          method: "POST",
          body: imageFormData,
        })
        const assocResult = await assocResponse.json()
        if (!assocResult.success) throw new Error(assocResult.error || "Erreur d'association de l'image luminaire.")
        console.log("✅ Image du luminaire associée !")
      }

      // Étape 3: Uploader l'image du designer si elle existe
      if (designerImageFile) {
        console.log(`👨‍🎨 Upload de l'image du designer...`)
        const designerImageFormData = new FormData()
        designerImageFormData.append("image", designerImageFile)
        designerImageFormData.append("luminaireId", newLuminaireId)
        const designerAssocResponse = await fetch("/api/luminaires/associate-designer-image", {
          method: "POST",
          body: designerImageFormData,
        })
        const designerAssocResult = await designerAssocResponse.json()
        if (!designerAssocResult.success)
          throw new Error(designerAssocResult.error || "Erreur d'association de l'image designer.")
        console.log("✅ Image du designer associée !")
      }

      onClose()
    } catch (error: any) {
      console.error("❌ Erreur dans le processus de création:", error)
      toast.error(error.message || "Une erreur est survenue.")
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLuminaireImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setLuminaireImageFile(file)
  }

  const handleDesignerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setDesignerImageFile(file)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un luminaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du luminaire</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              placeholder="Nom du luminaire"
              required
            />
          </div>

          <div>
            <Label htmlFor="artist">Artiste / Dates</Label>
            <Input
              id="artist"
              value={formData.artist}
              onChange={(e) => handleChange("artist", e.target.value)}
              placeholder="Artiste / Dates"
            />
          </div>

          <div>
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              value={formData.annee}
              onChange={(e) => handleChange("annee", e.target.value)}
              placeholder="1950"
            />
          </div>

          <div>
            <Label htmlFor="specialty">Spécialité</Label>
            <Input
              id="specialty"
              value={formData.specialty}
              onChange={(e) => handleChange("specialty", e.target.value)}
              placeholder="Spécialité"
            />
          </div>

          <div>
            <Label htmlFor="editeur">Editeur</Label>
            <Input
              id="editeur"
              value={formData.editeur}
              onChange={(e) => handleChange("editeur", e.target.value)}
              placeholder="Editeur"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description"
            />
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => handleChange("collaboration", e.target.value)}
              placeholder="Collaboration / Œuvre"
            />
          </div>

          <div>
            <Label htmlFor="signed">Signé</Label>
            <Input
              id="signed"
              value={formData.signed}
              onChange={(e) => handleChange("signed", e.target.value)}
              placeholder="Signé"
            />
          </div>

          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              value={formData.dimensions}
              onChange={(e) => handleChange("dimensions", e.target.value)}
              placeholder="Dimensions"
            />
          </div>

          <div>
            <Label htmlFor="materials">Matériaux</Label>
            <Input
              id="materials"
              value={formData.materials}
              onChange={(e) => handleChange("materials", e.target.value)}
              placeholder="Métal, Verre, Plastique"
            />
          </div>

          <div>
            <Label htmlFor="estimation">Estimation</Label>
            <Input
              id="estimation"
              value={formData.estimation}
              onChange={(e) => handleChange("estimation", e.target.value)}
              placeholder="1000-1500€"
            />
          </div>

          <div>
            <Label htmlFor="luminaire-image">Image du luminaire</Label>
            <Input id="luminaire-image" type="file" accept="image/*" onChange={handleLuminaireImageChange} />
            {luminaireImageFile && <p className="text-sm text-gray-600 mt-1">Fichier: {luminaireImageFile.name}</p>}
          </div>

          <div>
            <Label htmlFor="designer-image">Image du designer</Label>
            <Input id="designer-image" type="file" accept="image/*" onChange={handleDesignerImageChange} />
            {designerImageFile && <p className="text-sm text-gray-600 mt-1">Fichier: {designerImageFile.name}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={uploading}>
              {uploading ? "Création en cours..." : "Créer"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
