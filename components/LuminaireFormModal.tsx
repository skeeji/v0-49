"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<any>
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    annee: "",
    editeur: "",
    periode: "",
    collaboration: "",
    description: "",
    signe: "",
    dimensions: "",
    materiaux: "",
    estimation: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await onSubmit({
        ...formData,
        // Mapping pour compatibilité CSV
        "Nom luminaire": formData.nom,
        "Artiste / Dates": formData.designer,
        Année: formData.annee,
        Editeur: formData.editeur,
        Spécialité: formData.periode,
        "Collaboration / Œuvre": formData.collaboration,
        Description: formData.description,
        Signé: formData.signe,
        Dimensions: formData.dimensions,
        Matériaux: formData.materiaux,
        Estimation: formData.estimation,
        materials: formData.materiaux, // Ajout pour compatibilité
      })

      if (result.success) {
        setFormData({
          nom: "",
          designer: "",
          annee: "",
          editeur: "",
          periode: "",
          collaboration: "",
          description: "",
          signe: "",
          dimensions: "",
          materiaux: "",
          estimation: "",
        })
        onClose()
      }
    } catch (error) {
      console.error("❌ Erreur soumission formulaire:", error)
      toast.error("Erreur lors de la création du luminaire")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom du luminaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="designer">Artiste / Dates *</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleInputChange("designer", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="text"
                value={formData.annee}
                onChange={(e) => handleInputChange("annee", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="editeur">Éditeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleInputChange("editeur", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="periode">Spécialité</Label>
              <Input
                id="periode"
                value={formData.periode}
                onChange={(e) => handleInputChange("periode", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="signe">Signé</Label>
              <Select value={formData.signe} onValueChange={(value) => handleInputChange("signe", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oui">Oui</SelectItem>
                  <SelectItem value="Non">Non</SelectItem>
                  <SelectItem value="Étiquette">Étiquette</SelectItem>
                  <SelectItem value="Inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => handleInputChange("estimation", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => handleInputChange("collaboration", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="materiaux">Matériaux</Label>
            <Textarea
              id="materiaux"
              value={formData.materiaux}
              onChange={(e) => handleInputChange("materiaux", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: "#f2d895", color: "#000" }}
              className="hover:opacity-90"
            >
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
