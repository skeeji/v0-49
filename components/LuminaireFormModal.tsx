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
  onSuccess: () => void
}

export function LuminaireFormModal({ isOpen, onClose, onSuccess }: LuminaireFormModalProps) {
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

    const fullFormData = new FormData()
    Object.entries(formData).forEach(([key, value]) => fullFormData.append(key, value))
    if (luminaireImageFile) fullFormData.append("luminaireImage", luminaireImageFile)
    if (designerImageFile) fullFormData.append("designerImage", designerImageFile)

    try {
      const response = await fetch("/api/luminaires/create-full", { method: "POST", body: fullFormData })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast.success("Luminaire ajouté avec succès !")

      // Reset du formulaire
      setFormData({
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
      setLuminaireImageFile(null)
      setDesignerImageFile(null)

      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.")
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du luminaire *</Label>
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
              type="number"
              value={formData.annee}
              onChange={(e) => handleChange("annee", e.target.value)}
              placeholder="Année"
            />
          </div>

          <div>
            <Label htmlFor="specialty">Spécialité</Label>
            <Textarea
              id="specialty"
              value={formData.specialty}
              onChange={(e) => handleChange("specialty", e.target.value)}
              placeholder="Spécialité"
              rows={2}
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
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => handleChange("collaboration", e.target.value)}
              placeholder="Collaboration / Œuvre"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description"
              rows={3}
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
            <Label htmlFor="materials">Matériaux (séparés par des virgules)</Label>
            <Textarea
              id="materials"
              value={formData.materials}
              onChange={(e) => handleChange("materials", e.target.value)}
              placeholder="Bronze, Verre, Cristal"
              rows={2}
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
            <Label htmlFor="luminaireImage">Image du Luminaire</Label>
            <Input
              id="luminaireImage"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setLuminaireImageFile(e.target.files[0])}
              className="cursor-pointer"
            />
            {luminaireImageFile && (
              <p className="text-sm text-gray-600 mt-1">Fichier sélectionné: {luminaireImageFile.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="designerImage">Image du Designer (optionnel)</Label>
            <Input
              id="designerImage"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setDesignerImageFile(e.target.files[0])}
              className="cursor-pointer"
            />
            {designerImageFile && (
              <p className="text-sm text-gray-600 mt-1">Fichier sélectionné: {designerImageFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={uploading}
              style={{ backgroundColor: "#f2d895", color: "#000" }}
              className="hover:opacity-90"
            >
              {uploading ? "Création..." : "Créer le Luminaire"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
