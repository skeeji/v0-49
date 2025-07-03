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
      // Étape 1: Préparer et créer le luminaire (uniquement les données texte)
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
        // On ajoute aussi les champs compatibles CSV pour la cohérence
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

      // Étape 2: Si une image est sélectionnée, l'uploader et l'associer
      if (imageFile) {
        console.log(`🖼️ Upload et association de l'image pour l'ID ${newLuminaireId}...`)
        const imageFormData = new FormData()
        imageFormData.append("image", imageFile)
        imageFormData.append("luminaireId", newLuminaireId)

        const assocResponse = await fetch("/api/luminaires/associate-image", {
          method: "POST",
          body: imageFormData,
        })

        const assocResult = await assocResponse.json()
        if (!assocResult.success) {
          throw new Error(assocResult.error || "Erreur lors de l'association de l'image.")
        }
        console.log("✅ Image associée avec succès !")
      }

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
      // Le toast de succès est déjà dans la page parente, pas besoin de le répéter ici.
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("📁 Fichier sélectionné:", file.name, file.size, "bytes")
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
