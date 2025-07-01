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
    artiste: "",
    dates: "",
    annee: "",
    specialite: "",
    collaboration: "",
    signe: "",
    description: "",
    dimensions: "",
    materiaux: "",
    estimation: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let imageFilename = ""

      // Upload de l'image si sélectionnée
      if (selectedFile) {
        const imageFormData = new FormData()
        imageFormData.append("images", selectedFile)

        const imageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: imageFormData,
        })

        const imageData = await imageResponse.json()
        if (imageData.success && imageData.filenames && imageData.filenames.length > 0) {
          imageFilename = imageData.filenames[0]
        } else {
          throw new Error("Erreur lors de l'upload de l'image")
        }
      }

      // Créer le luminaire avec toutes les données
      const luminaireData = {
        nom: formData.nom,
        name: formData.nom, // Compatibilité
        artiste: formData.artiste,
        designer: formData.artiste, // Compatibilité
        dates: formData.dates,
        annee: Number.parseInt(formData.annee) || null,
        year: Number.parseInt(formData.annee) || null, // Compatibilité
        specialite: formData.specialite,
        periode: formData.specialite, // Compatibilité
        collaboration: formData.collaboration,
        description: formData.collaboration, // Compatibilité
        signe: formData.signe,
        dimensions: formData.dimensions,
        materiaux: formData.materiaux
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        estimation: formData.estimation,
        image: imageFilename,
        filename: imageFilename, // Compatibilité
        "Nom du fichier": imageFilename, // Compatibilité CSV
        "Nom luminaire": formData.nom, // Compatibilité CSV
        "Artiste / Dates": formData.artiste, // Compatibilité CSV
        Année: Number.parseInt(formData.annee) || null, // Compatibilité CSV
        Spécialité: formData.specialite, // Compatibilité CSV
        "Collaboration / Œuvre": formData.collaboration, // Compatibilité CSV
        Signé: formData.signe, // Compatibilité CSV
        Description: formData.description, // Compatibilité CSV
        Dimensions: formData.dimensions, // Compatibilité CSV
        Matériaux: formData.materiaux, // Compatibilité CSV
        Estimation: formData.estimation, // Compatibilité CSV
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await onSubmit(luminaireData)

      // Reset du formulaire
      setFormData({
        nom: "",
        artiste: "",
        dates: "",
        annee: "",
        specialite: "",
        collaboration: "",
        signe: "",
        description: "",
        dimensions: "",
        materiaux: "",
        estimation: "",
      })
      setSelectedFile(null)
      onClose()
    } catch (error: any) {
      console.error("Erreur lors de la création:", error)
      toast.error(error.message || "Erreur lors de la création du luminaire")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom du luminaire */}
          <div>
            <Label htmlFor="nom">Nom du luminaire *</Label>
            <Input id="nom" name="nom" value={formData.nom} onChange={handleInputChange} required />
          </div>

          {/* Artiste et Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="artiste">Artiste</Label>
              <Input id="artiste" name="artiste" value={formData.artiste} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="dates">Dates</Label>
              <Input
                id="dates"
                name="dates"
                value={formData.dates}
                onChange={handleInputChange}
                placeholder="ex: 1920-1980"
              />
            </div>
          </div>

          {/* Année */}
          <div>
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              name="annee"
              type="number"
              value={formData.annee}
              onChange={handleInputChange}
              placeholder="ex: 1950"
            />
          </div>

          {/* Spécialité */}
          <div>
            <Label htmlFor="specialite">Spécialité</Label>
            <Textarea
              id="specialite"
              name="specialite"
              value={formData.specialite}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Collaboration / Œuvre */}
          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              name="collaboration"
              value={formData.collaboration}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Signé */}
          <div>
            <Label htmlFor="signe">Signé</Label>
            <Input id="signe" name="signe" value={formData.signe} onChange={handleInputChange} />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          {/* Dimensions */}
          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              name="dimensions"
              value={formData.dimensions}
              onChange={handleInputChange}
              placeholder="ex: H. 30 cm, L. 20 cm"
            />
          </div>

          {/* Matériaux */}
          <div>
            <Label htmlFor="materiaux">Matériaux</Label>
            <Textarea
              id="materiaux"
              name="materiaux"
              value={formData.materiaux}
              onChange={handleInputChange}
              rows={2}
              placeholder="Séparez par des virgules"
            />
          </div>

          {/* Estimation */}
          <div>
            <Label htmlFor="estimation">Estimation</Label>
            <Input
              id="estimation"
              name="estimation"
              value={formData.estimation}
              onChange={handleInputChange}
              placeholder="ex: 1000-1500 €"
            />
          </div>

          {/* Image */}
          <div>
            <Label htmlFor="image">Image du luminaire</Label>
            <Input id="image" name="image" type="file" accept="image/*" onChange={handleFileChange} />
            {selectedFile && <p className="text-sm text-gray-600 mt-1">Fichier sélectionné: {selectedFile.name}</p>}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: "#f2d895", color: "#000" }}
              className="hover:opacity-90"
            >
              {isSubmitting ? "Création..." : "Créer le luminaire"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
