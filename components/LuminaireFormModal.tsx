"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
    description: "",
    materiaux: "",
    dimensions: "",
    estimation: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      materiaux: formData.materiaux
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    })
    setFormData({
      nom: "",
      designer: "",
      annee: "",
      periode: "",
      description: "",
      materiaux: "",
      dimensions: "",
      estimation: "",
    })
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du luminaire</Label>
            <Input id="nom" value={formData.nom} onChange={(e) => handleChange("nom", e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="designer">Designer</Label>
            <Input id="designer" value={formData.designer} onChange={(e) => handleChange("designer", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              type="number"
              value={formData.annee}
              onChange={(e) => handleChange("annee", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="periode">Période</Label>
            <Input id="periode" value={formData.periode} onChange={(e) => handleChange("periode", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="materiaux">Matériaux (séparés par des virgules)</Label>
            <Input
              id="materiaux"
              value={formData.materiaux}
              onChange={(e) => handleChange("materiaux", e.target.value)}
              placeholder="Bronze, Verre, Cristal"
            />
          </div>

          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              value={formData.dimensions}
              onChange={(e) => handleChange("dimensions", e.target.value)}
              placeholder="H: 50cm, L: 30cm"
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Créer
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
