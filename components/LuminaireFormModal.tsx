"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<any>
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    signe: "",
    nom: "",
    designer: "",
    annee: "",
    categorie: "",
    editeur: "",
    specialite: "",
    collaboration: "",
    description: "",
    materiaux: "",
    dimensions: "",
    estimation: "",
    lienSiteMarchand: "",
    etiquette: "",
    bibliographie: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await onSubmit(formData)
      if (result.success) {
        setFormData({
          signe: "",
          nom: "",
          designer: "",
          annee: "",
          categorie: "",
          editeur: "",
          specialite: "",
          collaboration: "",
          description: "",
          materiaux: "",
          dimensions: "",
          estimation: "",
          lienSiteMarchand: "",
          etiquette: "",
          bibliographie: "",
        })
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signe">Signé</Label>
              <Select value={formData.signe} onValueChange={(value) => handleChange("signe", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oui">Oui</SelectItem>
                  <SelectItem value="Non">Non</SelectItem>
                  <SelectItem value="Etiquette">Étiquette</SelectItem>
                  <SelectItem value="Attribué">Attribué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom">Nom du luminaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                required
                placeholder="Nom du luminaire"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designer">Designer</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleChange("designer", e.target.value)}
                placeholder="Nom du designer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                value={formData.annee}
                onChange={(e) => handleChange("annee", e.target.value)}
                placeholder="Année de création"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input
                id="categorie"
                value={formData.categorie}
                onChange={(e) => handleChange("categorie", e.target.value)}
                placeholder="Catégorie"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editeur">Éditeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleChange("editeur", e.target.value)}
                placeholder="Éditeur"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialite">Spécialité</Label>
              <Input
                id="specialite"
                value={formData.specialite}
                onChange={(e) => handleChange("specialite", e.target.value)}
                placeholder="Spécialité"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Input
                id="collaboration"
                value={formData.collaboration}
                onChange={(e) => handleChange("collaboration", e.target.value)}
                placeholder="Collaboration"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description détaillée du luminaire"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materiaux">Matériaux</Label>
              <Input
                id="materiaux"
                value={formData.materiaux}
                onChange={(e) => handleChange("materiaux", e.target.value)}
                placeholder="Ex: Métal, Verre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleChange("dimensions", e.target.value)}
                placeholder="Ex: 50 x 30 cm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimation">Estimation</Label>
            <Input
              id="estimation"
              value={formData.estimation}
              onChange={(e) => handleChange("estimation", e.target.value)}
              placeholder="Prix estimé"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lienSiteMarchand">Lien site marchand</Label>
            <Input
              id="lienSiteMarchand"
              type="url"
              value={formData.lienSiteMarchand}
              onChange={(e) => handleChange("lienSiteMarchand", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etiquette">Étiquette</Label>
              <Input
                id="etiquette"
                value={formData.etiquette}
                onChange={(e) => handleChange("etiquette", e.target.value)}
                placeholder="Étiquette"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bibliographie">Bibliographie</Label>
              <Input
                id="bibliographie"
                value={formData.bibliographie}
                onChange={(e) => handleChange("bibliographie", e.target.value)}
                placeholder="Références"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
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
