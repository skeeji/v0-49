"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Check, X } from "lucide-react"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function LuminaireFormModal({ isOpen, onClose, onSuccess }: LuminaireFormModalProps) {
  const [step, setStep] = useState(1)
  const [luminaireId, setLuminaireId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données du formulaire
  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    annee: "",
    periode: "",
    editeur: "",
    description: "",
    collaboration: "",
    signe: "",
    dimensions: "",
    materiaux: "",
    estimation: "",
  })

  // Images
  const [luminaireImage, setLuminaireImage] = useState<File | null>(null)
  const [designerImage, setDesignerImage] = useState<File | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStep1Submit = async () => {
    if (!formData.nom || !formData.designer) {
      setError("Le nom et le designer sont obligatoires")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          designer: formData.designer,
          annee: formData.annee ? Number.parseInt(formData.annee) : null,
          periode: formData.periode,
          editeur: formData.editeur,
          description: formData.description,
          collaboration: formData.collaboration,
          signe: formData.signe,
          dimensions: formData.dimensions,
          materiaux: formData.materiaux
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
          estimation: formData.estimation,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setLuminaireId(result.id)
        setStep(2)
      } else {
        throw new Error(result.error || "Erreur lors de la création")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async () => {
    if (!luminaireImage || !luminaireId) {
      setError("Veuillez sélectionner une image")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", luminaireImage)
      formData.append("luminaireId", luminaireId)

      const response = await fetch("/api/luminaires/associate-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setStep(3)
      } else {
        throw new Error(result.error || "Erreur lors de l'upload")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStep3Submit = async () => {
    if (!designerImage || !luminaireId) {
      // Pas d'image designer, on termine
      handleComplete()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", designerImage)
      formData.append("luminaireId", luminaireId)

      const response = await fetch("/api/luminaires/associate-designer-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        handleComplete()
      } else {
        throw new Error(result.error || "Erreur lors de l'upload")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    resetForm()
    onSuccess()
  }

  const resetForm = () => {
    setStep(1)
    setLuminaireId(null)
    setLoading(false)
    setError(null)
    setFormData({
      nom: "",
      designer: "",
      annee: "",
      periode: "",
      editeur: "",
      description: "",
      collaboration: "",
      signe: "",
      dimensions: "",
      materiaux: "",
      estimation: "",
    })
    setLuminaireImage(null)
    setDesignerImage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ajouter un luminaire - Étape {step}/3
            {step === 1 && " : Informations"}
            {step === 2 && " : Image du luminaire"}
            {step === 3 && " : Image du designer (optionnel)"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="designer">Designer *</Label>
                <Input
                  id="designer"
                  value={formData.designer}
                  onChange={(e) => handleInputChange("designer", e.target.value)}
                  placeholder="Nom du designer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annee">Année</Label>
                <Input
                  id="annee"
                  type="number"
                  value={formData.annee}
                  onChange={(e) => handleInputChange("annee", e.target.value)}
                  placeholder="1950"
                />
              </div>
              <div>
                <Label htmlFor="periode">Spécialité/Période</Label>
                <Input
                  id="periode"
                  value={formData.periode}
                  onChange={(e) => handleInputChange("periode", e.target.value)}
                  placeholder="Art Déco, Moderniste..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editeur">Editeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleInputChange("editeur", e.target.value)}
                placeholder="Nom de l'éditeur"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description du luminaire"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Textarea
                id="collaboration"
                value={formData.collaboration}
                onChange={(e) => handleInputChange("collaboration", e.target.value)}
                placeholder="Informations sur la collaboration"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signe">Signé</Label>
                <Input
                  id="signe"
                  value={formData.signe}
                  onChange={(e) => handleInputChange("signe", e.target.value)}
                  placeholder="Oui/Non"
                />
              </div>
              <div>
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => handleInputChange("dimensions", e.target.value)}
                  placeholder="H x L x P cm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="materiaux">Matériaux</Label>
              <Input
                id="materiaux"
                value={formData.materiaux}
                onChange={(e) => handleInputChange("materiaux", e.target.value)}
                placeholder="Métal, Verre, Bois... (séparés par des virgules)"
              />
            </div>

            <div>
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => handleInputChange("estimation", e.target.value)}
                placeholder="Prix estimé"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleStep1Submit} disabled={loading}>
                {loading ? "Création..." : "Suivant"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm mb-4">
                <div className="flex items-center gap-2 justify-center">
                  <Check className="w-4 h-4" />
                  Luminaire créé avec succès !
                </div>
              </div>
              <p className="text-gray-600 mb-4">Maintenant, ajoutez l'image du luminaire</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLuminaireImage(e.target.files?.[0] || null)}
                className="hidden"
                id="luminaire-image"
              />
              <label htmlFor="luminaire-image" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {luminaireImage ? luminaireImage.name : "Cliquez pour sélectionner une image"}
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleStep2Submit} disabled={loading || !luminaireImage}>
                {loading ? "Upload..." : "Suivant"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm mb-4">
                <div className="flex items-center gap-2 justify-center">
                  <Check className="w-4 h-4" />
                  Image du luminaire ajoutée !
                </div>
              </div>
              <p className="text-gray-600 mb-4">Ajoutez une image du designer (optionnel)</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDesignerImage(e.target.files?.[0] || null)}
                className="hidden"
                id="designer-image"
              />
              <label htmlFor="designer-image" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {designerImage ? designerImage.name : "Cliquez pour sélectionner une image du designer"}
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleComplete}>
                Ignorer
              </Button>
              <Button onClick={handleStep3Submit} disabled={loading}>
                {loading ? "Upload..." : "Terminer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
