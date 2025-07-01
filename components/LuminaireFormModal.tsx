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
  onSubmit: (data: any) => void
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    artist: "",
    annee: "",
    specialty: "",
    collaboration: "",
    signed: "",
    description: "",
    dimensions: "",
    materials: "",
    estimation: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let filename = ""

      // Upload de l'image si présente
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append("images", imageFile)

        const uploadResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: imageFormData,
        })

        const uploadResult = await uploadResponse.json()
        if (uploadResult.success) {
          filename = imageFile.name
        } else {
          throw new Error("Erreur lors de l'upload de l'image")
        }
      }

      // Préparer les données du luminaire
      const luminaireData = {
        nom: formData.nom,
        designer: formData.artist,
        annee: formData.annee ? Number.parseInt(formData.annee) : null,
        periode: formData.specialty,
        description: formData.collaboration,
        signe: formData.signed,
        dimensions: formData.dimensions,
        materiaux: formData.materials
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        estimation: formData.estimation,
        filename: filename,
        images: filename ? [filename] : [],
        // Champs CSV pour compatibilité
        "Nom luminaire": formData.nom,
        "Artiste / Dates": formData.artist,
        Année: formData.annee,
        Spécialité: formData.specialty,
        "Collaboration / Œuvre": formData.collaboration,
        Signé: formData.signed,
        "Nom du fichier": filename,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await onSubmit(luminaireData)

      // Reset du formulaire
      setFormData({
        nom: "",
        artist: "",
        annee: "",
        specialty: "",
        collaboration: "",
        signed: "",
        description: "",
        dimensions: "",
        materials: "",
        estimation: "",
      })
      setImageFile(null)
      onClose()
      toast.success("Luminaire créé avec succès")
    } catch (error: any) {
      console.error("❌ Erreur lors de la création:", error)
      toast.error(error.message || "Erreur lors de la création du luminaire")
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
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
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => handleChange("collaboration", e.target.value)}
              placeholder="Collaboration / Œuvre"
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
            <Label htmlFor="image">Image du luminaire</Label>
            <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
            {imageFile && <p className="text-sm text-gray-600 mt-1">Fichier sélectionné: {imageFile.name}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: "#f2d895", color: "#000" }}
              disabled={uploading}
            >
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
