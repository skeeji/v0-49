"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
    periode: "",
    collaboration: "",
    description: "",
    editeur: "",
    signe: "",
    dimensions: "",
    estimation: "",
    materiaux: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [luminaireId, setLuminaireId] = useState<string | null>(null)
  const [luminaireImage, setLuminaireImage] = useState<File | null>(null)
  const [designerImage, setDesignerImage] = useState<File | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStep1Submit = async () => {
    if (!formData.nom.trim()) {
      toast.error("Le nom du luminaire est requis")
      return
    }

    setIsSubmitting(true)
    try {
      // Créer le luminaire
      const result = await onSubmit({
        nom: formData.nom,
        designer: formData.designer,
        annee: formData.annee ? Number.parseInt(formData.annee) : null,
        periode: formData.periode,
        collaboration: formData.collaboration,
        description: formData.description,
        editeur: formData.editeur,
        signe: formData.signe,
        dimensions: formData.dimensions,
        estimation: formData.estimation,
        materiaux: formData.materiaux ? formData.materiaux.split(",").map((m) => m.trim()) : [],
      })

      if (result.success) {
        setLuminaireId(result.id)
        setCurrentStep(2)
        toast.success("Luminaire créé ! Ajoutez maintenant l'image du luminaire.")
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error("Erreur lors de la création : " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStep2Submit = async () => {
    if (!luminaireImage) {
      toast.error("Veuillez sélectionner une image pour le luminaire")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("image", luminaireImage)
      formData.append("luminaireId", luminaireId!)

      const response = await fetch("/api/luminaires/associate-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setCurrentStep(3)
        toast.success("Image du luminaire ajoutée ! Ajoutez maintenant l'image du designer (optionnel).")
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'upload : " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStep3Submit = async () => {
    setIsSubmitting(true)
    try {
      if (designerImage) {
        const formData = new FormData()
        formData.append("image", designerImage)
        formData.append("luminaireId", luminaireId!)

        const response = await fetch("/api/luminaires/associate-designer-image", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error)
        }

        toast.success("Image du designer ajoutée !")
      }

      // Fermer le modal et réinitialiser
      handleClose()
      toast.success("Luminaire créé avec succès !")
    } catch (error: any) {
      toast.error("Erreur lors de l'upload : " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      nom: "",
      designer: "",
      annee: "",
      periode: "",
      collaboration: "",
      description: "",
      editeur: "",
      signe: "",
      dimensions: "",
      estimation: "",
      materiaux: "",
    })
    setCurrentStep(1)
    setLuminaireId(null)
    setLuminaireImage(null)
    setDesignerImage(null)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 1 && "Créer un nouveau luminaire"}
            {currentStep === 2 && "Ajouter l'image du luminaire"}
            {currentStep === 3 && "Ajouter l'image du designer (optionnel)"}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom du luminaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                placeholder="Nom du luminaire"
              />
            </div>

            <div>
              <Label htmlFor="designer">Artiste / Dates</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleInputChange("designer", e.target.value)}
                placeholder="Artiste / Dates"
              />
            </div>

            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="number"
                value={formData.annee}
                onChange={(e) => handleInputChange("annee", e.target.value)}
                placeholder="Année"
              />
            </div>

            <div>
              <Label htmlFor="periode">Spécialité</Label>
              <Input
                id="periode"
                value={formData.periode}
                onChange={(e) => handleInputChange("periode", e.target.value)}
                placeholder="Spécialité"
              />
            </div>

            <div>
              <Label htmlFor="editeur">Editeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleInputChange("editeur", e.target.value)}
                placeholder="Editeur"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Textarea
                id="collaboration"
                value={formData.collaboration}
                onChange={(e) => handleInputChange("collaboration", e.target.value)}
                placeholder="Collaboration / Œuvre"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="signe">Signé</Label>
              <Input
                id="signe"
                value={formData.signe}
                onChange={(e) => handleInputChange("signe", e.target.value)}
                placeholder="Signé"
              />
            </div>

            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
                placeholder="Dimensions"
              />
            </div>

            <div>
              <Label htmlFor="materiaux">Matériaux (séparés par des virgules)</Label>
              <Input
                id="materiaux"
                value={formData.materiaux}
                onChange={(e) => handleInputChange("materiaux", e.target.value)}
                placeholder="Métal, Verre, Plastique..."
              />
            </div>

            <div>
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => handleInputChange("estimation", e.target.value)}
                placeholder="Estimation"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleStep1Submit} disabled={isSubmitting}>
                {isSubmitting ? "Création..." : "Créer le luminaire"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="luminaire-image">Image du luminaire *</Label>
              <Input
                id="luminaire-image"
                type="file"
                accept="image/*"
                onChange={(e) => setLuminaireImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleStep2Submit} disabled={isSubmitting || !luminaireImage}>
                {isSubmitting ? "Upload..." : "Ajouter l'image"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="designer-image">Image du designer (optionnel)</Label>
              <Input
                id="designer-image"
                type="file"
                accept="image/*"
                onChange={(e) => setDesignerImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => handleStep3Submit()}>
                Passer cette étape
              </Button>
              <Button onClick={handleStep3Submit} disabled={isSubmitting}>
                {isSubmitting ? "Upload..." : designerImage ? "Ajouter l'image" : "Terminer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
