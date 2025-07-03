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
    collaboration: "",
    description: "",
    signe: "",
    dimensions: "",
    materiaux: "",
    estimation: "",
    editeur: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    const fullFormData = new FormData()
    Object.entries(formData).forEach(([key, value]) => fullFormData.append(key, value))
    if (imageFile) fullFormData.append("image", imageFile)

    try {
      // On appelle directement la route POST principale
      const response = await fetch("/api/luminaires", { method: "POST", body: fullFormData })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Erreur inconnue.")

      toast.success("Luminaire ajouté avec succès !")

      // Reset du formulaire
      setFormData({
        nom: "",
        designer: "",
        annee: "",
        periode: "",
        collaboration: "",
        description: "",
        signe: "",
        dimensions: "",
        materiaux: "",
        estimation: "",
        editeur: "",
      })
      setImageFile(null)

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="designer">Designer</Label>
            <Input
              id="designer"
              value={formData.designer}
              onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              type="number"
              value={formData.annee}
              onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="periode">Spécialité</Label>
            <Input
              id="periode"
              value={formData.periode}
              onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="editeur">Editeur</Label>
            <Input
              id="editeur"
              value={formData.editeur}
              onChange={(e) => setFormData({ ...formData, editeur: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => setFormData({ ...formData, collaboration: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="signe">Signé</Label>
            <Input
              id="signe"
              value={formData.signe}
              onChange={(e) => setFormData({ ...formData, signe: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="estimation">Estimation</Label>
            <Input
              id="estimation"
              value={formData.estimation}
              onChange={(e) => setFormData({ ...formData, estimation: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="materiaux">Matériaux (séparés par virgule)</Label>
            <Input
              id="materiaux"
              value={formData.materiaux}
              onChange={(e) => setFormData({ ...formData, materiaux: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
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
