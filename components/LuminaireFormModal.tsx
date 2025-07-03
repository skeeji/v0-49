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
    annee: "",
    periode: "",
    editeur: "",
    collaboration: "",
    description: "",
    signe: "",
    dimensions: "",
    estimation: "",
    materiaux: "",
  })
  const [luminaireImageFile, setLuminaireImageFile] = useState<File | null>(null)
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
      // Étape 1: Création du document luminaire
      const luminaireData = {
        ...formData,
        annee: formData.annee ? Number.parseInt(formData.annee) : null,
        materiaux: formData.materiaux
          ? formData.materiaux
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
      }

      const createResponse = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(luminaireData),
      })

      const createResult = await createResponse.json()
      if (!createResult.success) throw new Error(createResult.error || "Erreur création luminaire")

      const luminaireId = createResult.id

      // Étape 2: Upload image luminaire si présente
      if (luminaireImageFile) {
        const imageFormData = new FormData()
        imageFormData.append("image", luminaireImageFile)
        imageFormData.append("luminaireId", luminaireId)

        const imageResponse = await fetch("/api/luminaires/associate-image", {
          method: "POST",
          body: imageFormData,
        })

        const imageResult = await imageResponse.json()
        if (!imageResult.success) {
          console.warn("Erreur upload image luminaire:", imageResult.error)
        }
      }

      // Étape 3: Upload image designer si présente
      if (designerImageFile) {
        const designerFormData = new FormData()
        designerFormData.append("image", designerImageFile)
        designerFormData.append("luminaireId", luminaireId)

        const designerResponse = await fetch("/api/luminaires/associate-designer-image", {
          method: "POST",
          body: designerFormData,
        })

        const designerResult = await designerResponse.json()
        if (!designerResult.success) {
          console.warn("Erreur upload image designer:", designerResult.error)
        }
      }

      toast.success("Luminaire ajouté avec succès !")
      onSuccess()
      onClose()

      // Reset form
      setFormData({
        nom: "",
        designer: "",
        annee: "",
        periode: "",
        editeur: "",
        collaboration: "",
        description: "",
        signe: "",
        dimensions: "",
        estimation: "",
        materiaux: "",
      })
      setLuminaireImageFile(null)
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
        <form onSubmit={handleSubmit} className="space-y-3 p-1">
          <div>
            <Label>Nom *</Label>
            <Input name="nom" value={formData.nom} onChange={handleChange} required />
          </div>
          <div>
            <Label>Designer</Label>
            <Input name="designer" value={formData.designer} onChange={handleChange} />
          </div>
          <div>
            <Label>Image du Designer</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setDesignerImageFile(e.target.files[0])}
            />
          </div>
          <div>
            <Label>Année</Label>
            <Input name="annee" type="number" value={formData.annee} onChange={handleChange} />
          </div>
          <div>
            <Label>Spécialité</Label>
            <Input name="periode" value={formData.periode} onChange={handleChange} />
          </div>
          <div>
            <Label>Editeur</Label>
            <Input name="editeur" value={formData.editeur} onChange={handleChange} />
          </div>
          <div>
            <Label>Collaboration / Œuvre</Label>
            <Textarea name="collaboration" value={formData.collaboration} onChange={handleChange} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" value={formData.description} onChange={handleChange} />
          </div>
          <div>
            <Label>Signé</Label>
            <Input name="signe" value={formData.signe} onChange={handleChange} />
          </div>
          <div>
            <Label>Dimensions</Label>
            <Input name="dimensions" value={formData.dimensions} onChange={handleChange} />
          </div>
          <div>
            <Label>Estimation</Label>
            <Input name="estimation" value={formData.estimation} onChange={handleChange} />
          </div>
          <div>
            <Label>Matériaux (séparés par virgule)</Label>
            <Input name="materiaux" value={formData.materiaux} onChange={handleChange} />
          </div>
          <div>
            <Label>Image du Luminaire</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setLuminaireImageFile(e.target.files[0])}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
