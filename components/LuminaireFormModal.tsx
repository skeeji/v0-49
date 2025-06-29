"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    annee: "",
    periode: "",
    materiaux: "",
    couleurs: "",
    dimensions: "",
    estimation: "",
    description: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      nom: "",
      designer: "",
      annee: "",
      periode: "",
      materiaux: "",
      couleurs: "",
      dimensions: "",
      estimation: "",
      description: "",
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-serif">Ajouter un luminaire</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom du luminaire</Label>
              <Input
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Nom du luminaire"
                required
              />
            </div>

            <div>
              <Label htmlFor="designer">Designer</Label>
              <Input
                id="designer"
                name="designer"
                value={formData.designer}
                onChange={handleChange}
                placeholder="Nom du designer"
              />
            </div>

            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                name="annee"
                value={formData.annee}
                onChange={handleChange}
                placeholder="Année de création"
              />
            </div>

            <div>
              <Label htmlFor="periode">Période</Label>
              <Input
                id="periode"
                name="periode"
                value={formData.periode}
                onChange={handleChange}
                placeholder="Période artistique"
              />
            </div>

            <div>
              <Label htmlFor="materiaux">Matériaux</Label>
              <Input
                id="materiaux"
                name="materiaux"
                value={formData.materiaux}
                onChange={handleChange}
                placeholder="Matériaux utilisés"
              />
            </div>

            <div>
              <Label htmlFor="couleurs">Couleurs</Label>
              <Input
                id="couleurs"
                name="couleurs"
                value={formData.couleurs}
                onChange={handleChange}
                placeholder="Couleurs principales"
              />
            </div>

            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="Dimensions"
              />
            </div>

            <div>
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                name="estimation"
                value={formData.estimation}
                onChange={handleChange}
                placeholder="Estimation de prix"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description détaillée du luminaire"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Ajouter
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
