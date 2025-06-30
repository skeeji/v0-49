"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (luminaire: any) => void
  luminaire?: any
}

export function LuminaireFormModal({ isOpen, onClose, onSave, luminaire }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    "Nom luminaire": luminaire?.["Nom luminaire"] || "",
    "Artiste / Dates": luminaire?.["Artiste / Dates"] || "",
    Année: luminaire?.["Année"] || "",
    Période: luminaire?.["Période"] || "",
    Type: luminaire?.["Type"] || "",
    Spécialité: luminaire?.["Spécialité"] || "",
    "Collaboration / Œuvre": luminaire?.["Collaboration / Œuvre"] || "",
    Description: luminaire?.["Description"] || "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const method = luminaire ? "PUT" : "POST"
      const url = luminaire ? `/api/luminaires/${luminaire._id}` : "/api/luminaires"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        onSave(result.luminaire)
        onClose()
        setFormData({
          "Nom luminaire": "",
          "Artiste / Dates": "",
          Année: "",
          Période: "",
          Type: "",
          Spécialité: "",
          "Collaboration / Œuvre": "",
          Description: "",
        })
      } else {
        console.error("Erreur:", result.error)
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{luminaire ? "Modifier le luminaire" : "Ajouter un luminaire"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom du luminaire</Label>
              <Input
                id="nom"
                value={formData["Nom luminaire"]}
                onChange={(e) => handleChange("Nom luminaire", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="artiste">Artiste / Dates</Label>
              <Input
                id="artiste"
                value={formData["Artiste / Dates"]}
                onChange={(e) => handleChange("Artiste / Dates", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="number"
                value={formData["Année"]}
                onChange={(e) => handleChange("Année", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="periode">Période</Label>
              <Input
                id="periode"
                value={formData["Période"]}
                onChange={(e) => handleChange("Période", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={formData["Type"]} onChange={(e) => handleChange("Type", e.target.value)} />
            </div>

            <div>
              <Label htmlFor="specialite">Spécialité</Label>
              <Input
                id="specialite"
                value={formData["Spécialité"]}
                onChange={(e) => handleChange("Spécialité", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData["Collaboration / Œuvre"]}
              onChange={(e) => handleChange("Collaboration / Œuvre", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData["Description"]}
              onChange={(e) => handleChange("Description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {luminaire ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
