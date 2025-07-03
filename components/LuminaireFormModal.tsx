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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    const fullFormData = new FormData()
    Object.entries(formData).forEach(([key, value]) => fullFormData.append(key, value))
    if (luminaireImageFile) fullFormData.append("luminaireImage", luminaireImageFile)
    if (designerImageFile) fullFormData.append("designerImage", designerImageFile)

    try {
      const response = await fetch("/api/luminaires", { method: "POST", body: fullFormData })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Une erreur est survenue lors de la création.")

      toast.success("Luminaire ajouté avec succès !")

      // Reset du formulaire
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

      onSuccess()
      onClose()
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
            <Label>Nom du luminaire *</Label>
            <Input
              name="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Designer</Label>
            <Input
              name="designer"
              value={formData.designer}
              onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
            />
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
            <Input
              name="annee"
              type="number"
              value={formData.annee}
              onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
            />
          </div>

          <div>
            <Label>Spécialité</Label>
            <Input
              name="periode"
              value={formData.periode}
              onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
            />
          </div>

          <div>
            <Label>Editeur</Label>
            <Input
              name="editeur"
              value={formData.editeur}
              onChange={(e) => setFormData({ ...formData, editeur: e.target.value })}
            />
          </div>

          <div>
            <Label>Collaboration / Œuvre</Label>
            <Textarea
              name="collaboration"
              value={formData.collaboration}
              onChange={(e) => setFormData({ ...formData, collaboration: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Signé</Label>
            <Input
              name="signe"
              value={formData.signe}
              onChange={(e) => setFormData({ ...formData, signe: e.target.value })}
            />
          </div>

          <div>
            <Label>Dimensions</Label>
            <Input
              name="dimensions"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
            />
          </div>

          <div>
            <Label>Estimation</Label>
            <Input
              name="estimation"
              value={formData.estimation}
              onChange={(e) => setFormData({ ...formData, estimation: e.target.value })}
            />
          </div>

          <div>
            <Label>Matériaux (séparés par virgule)</Label>
            <Input
              name="materiaux"
              value={formData.materiaux}
              onChange={(e) => setFormData({ ...formData, materiaux: e.target.value })}
            />
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
