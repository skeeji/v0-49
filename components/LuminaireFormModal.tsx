"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<any>
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    "Nom luminaire": "",
    designer: "",
    "Artiste / Dates": "",
    annee: "",
    Année: "",
    periode: "",
    Spécialité: "",
    categorie: "",
    Catégorie: "",
    collaboration: "",
    "Collaboration / Œuvre": "",
    description: "",
    Description: "",
    dimensions: "",
    Dimensions: "",
    estimation: "",
    Estimation: "",
    editeur: "",
    Editeur: "",
    materiaux: "",
    Matériaux: "",
    signe: "",
    Signé: "",
    filename: "",
    "Nom du fichier": "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Synchroniser les champs équivalents
      ...(field === "nom" && { "Nom luminaire": value }),
      ...(field === "Nom luminaire" && { nom: value }),
      ...(field === "designer" && { "Artiste / Dates": value }),
      ...(field === "Artiste / Dates" && { designer: value }),
      ...(field === "annee" && { Année: value }),
      ...(field === "Année" && { annee: value }),
      ...(field === "periode" && { Spécialité: value }),
      ...(field === "Spécialité" && { periode: value }),
      ...(field === "categorie" && { Catégorie: value }),
      ...(field === "Catégorie" && { categorie: value }),
      ...(field === "collaboration" && { "Collaboration / Œuvre": value }),
      ...(field === "Collaboration / Œuvre" && { collaboration: value }),
      ...(field === "description" && { Description: value }),
      ...(field === "Description" && { description: value }),
      ...(field === "dimensions" && { Dimensions: value }),
      ...(field === "Dimensions" && { dimensions: value }),
      ...(field === "estimation" && { Estimation: value }),
      ...(field === "Estimation" && { estimation: value }),
      ...(field === "editeur" && { Editeur: value }),
      ...(field === "Editeur" && { editeur: value }),
      ...(field === "materiaux" && { Matériaux: value }),
      ...(field === "Matériaux" && { materiaux: value }),
      ...(field === "signe" && { Signé: value }),
      ...(field === "Signé" && { signe: value }),
      ...(field === "filename" && { "Nom du fichier": value }),
      ...(field === "Nom du fichier" && { filename: value }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await onSubmit(formData)
      if (result.success) {
        // Réinitialiser le formulaire
        setFormData({
          nom: "",
          "Nom luminaire": "",
          designer: "",
          "Artiste / Dates": "",
          annee: "",
          Année: "",
          periode: "",
          Spécialité: "",
          categorie: "",
          Catégorie: "",
          collaboration: "",
          "Collaboration / Œuvre": "",
          description: "",
          Description: "",
          dimensions: "",
          Dimensions: "",
          estimation: "",
          Estimation: "",
          editeur: "",
          Editeur: "",
          materiaux: "",
          Matériaux: "",
          signe: "",
          Signé: "",
          filename: "",
          "Nom du fichier": "",
        })
        onClose()
      }
    } catch (error) {
      console.error("❌ Erreur soumission formulaire:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Ajouter un nouveau luminaire</DialogTitle>
          <DialogDescription>Remplissez les informations du luminaire à ajouter à la collection.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom du luminaire */}
            <div>
              <Label htmlFor="nom">Nom du luminaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                placeholder="Nom du luminaire"
                required
              />
            </div>

            {/* Artiste / Designer */}
            <div>
              <Label htmlFor="designer">Artiste / Dates *</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleInputChange("designer", e.target.value)}
                placeholder="Nom de l'artiste et dates"
                required
              />
            </div>

            {/* Année */}
            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                value={formData.annee}
                onChange={(e) => handleInputChange("annee", e.target.value)}
                placeholder="Année de création"
                type="number"
              />
            </div>

            {/* Catégorie */}
            <div>
              <Label htmlFor="categorie">Catégorie</Label>
              <Select value={formData.categorie} onValueChange={(value) => handleInputChange("categorie", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Suspension">Suspension</SelectItem>
                  <SelectItem value="Applique">Applique</SelectItem>
                  <SelectItem value="Lampe de table">Lampe de table</SelectItem>
                  <SelectItem value="Lampadaire">Lampadaire</SelectItem>
                  <SelectItem value="Plafonnier">Plafonnier</SelectItem>
                  <SelectItem value="Lustre">Lustre</SelectItem>
                  <SelectItem value="Lampe de bureau">Lampe de bureau</SelectItem>
                  <SelectItem value="Veilleuse">Veilleuse</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Editeur */}
            <div>
              <Label htmlFor="editeur">Editeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleInputChange("editeur", e.target.value)}
                placeholder="Nom de l'éditeur"
              />
            </div>

            {/* Dimensions */}
            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
                placeholder="Dimensions (ex: H 30 x L 20 cm)"
              />
            </div>

            {/* Estimation */}
            <div>
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => handleInputChange("estimation", e.target.value)}
                placeholder="Estimation (ex: 500-800 €)"
              />
            </div>

            {/* Signé */}
            <div>
              <Label htmlFor="signe">Signé</Label>
              <Select value={formData.signe} onValueChange={(value) => handleInputChange("signe", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Le luminaire est-il signé ?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oui">Oui</SelectItem>
                  <SelectItem value="Non">Non</SelectItem>
                  <SelectItem value="Inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nom du fichier image */}
            <div>
              <Label htmlFor="filename">Nom du fichier image</Label>
              <Input
                id="filename"
                value={formData.filename}
                onChange={(e) => handleInputChange("filename", e.target.value)}
                placeholder="nom-image.jpg"
              />
            </div>
          </div>

          {/* Champs texte longs */}
          <div className="space-y-4">
            {/* Spécialité */}
            <div>
              <Label htmlFor="periode">Spécialité</Label>
              <Textarea
                id="periode"
                value={formData.periode}
                onChange={(e) => handleInputChange("periode", e.target.value)}
                placeholder="Spécialité ou style artistique"
                rows={2}
              />
            </div>

            {/* Collaboration / Œuvre */}
            <div>
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Textarea
                id="collaboration"
                value={formData.collaboration}
                onChange={(e) => handleInputChange("collaboration", e.target.value)}
                placeholder="Informations sur les collaborations ou œuvres"
                rows={2}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description détaillée du luminaire"
                rows={3}
              />
            </div>

            {/* Matériaux */}
            <div>
              <Label htmlFor="materiaux">Matériaux</Label>
              <Textarea
                id="materiaux"
                value={formData.materiaux}
                onChange={(e) => handleInputChange("materiaux", e.target.value)}
                placeholder="Matériaux utilisés (ex: Métal, Verre, Plastique...)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
