"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    periode: "",
    description: "", // CORRECTION 2: Champ description séparé
    collaboration: "", // CORRECTION 2: Champ collaboration séparé
    signe: "",
    editeur: "",
    dimensions: "",
    materiaux: [] as string[],
    estimation: "",
    couleurs: [] as string[],
  })

  const [images, setImages] = useState<File[]>([])
  const [designerImage, setDesignerImage] = useState<File | null>(null)
  const [materialInput, setMaterialInput] = useState("")
  const [colorInput, setColorInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const designerImageInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages((prev) => [...prev, ...files])
  }

  const handleDesignerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDesignerImage(file)
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeDesignerImage = () => {
    setDesignerImage(null)
    if (designerImageInputRef.current) {
      designerImageInputRef.current.value = ""
    }
  }

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materiaux.includes(materialInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        materiaux: [...prev.materiaux, materialInput.trim()],
      }))
      setMaterialInput("")
    }
  }

  const removeMaterial = (material: string) => {
    setFormData((prev) => ({
      ...prev,
      materiaux: prev.materiaux.filter((m) => m !== material),
    }))
  }

  const addColor = () => {
    if (colorInput.trim() && !formData.couleurs.includes(colorInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        couleurs: [...prev.couleurs, colorInput.trim()],
      }))
      setColorInput("")
    }
  }

  const removeColor = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      couleurs: prev.couleurs.filter((c) => c !== color),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.nom.trim()) {
        toast.error("Le nom du luminaire est requis")
        return
      }

      // Upload des images principales
      let uploadedImages: string[] = []
      if (images.length > 0) {
        const imageFormData = new FormData()
        images.forEach((image) => {
          imageFormData.append("images", image)
        })

        const imageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: imageFormData,
        })

        const imageData = await imageResponse.json()
        if (imageData.success) {
          uploadedImages = imageData.filenames
        } else {
          throw new Error("Erreur lors de l'upload des images")
        }
      }

      // Upload de l'image designer
      let designerImageFilename = ""
      if (designerImage) {
        const designerFormData = new FormData()
        designerFormData.append("image", designerImage)
        designerFormData.append("designer", formData.designer)

        const designerImageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: designerFormData,
        })

        const designerImageData = await designerImageResponse.json()
        if (designerImageData.success && designerImageData.filenames.length > 0) {
          designerImageFilename = designerImageData.filenames[0]
        }
      }

      // Préparer les données du luminaire
      const luminaireData = {
        ...formData,
        annee: formData.annee ? Number.parseInt(formData.annee) : null,
        images: uploadedImages,
        filename: uploadedImages[0] || "",
        designerImageFilename,
      }

      // Soumettre le luminaire
      const result = await onSubmit(luminaireData)

      if (result.success) {
        // Reset du formulaire
        setFormData({
          nom: "",
          designer: "",
          annee: "",
          periode: "",
          description: "", // CORRECTION 2: Reset séparé
          collaboration: "", // CORRECTION 2: Reset séparé
          signe: "",
          editeur: "",
          dimensions: "",
          materiaux: [],
          estimation: "",
          couleurs: [],
        })
        setImages([])
        setDesignerImage(null)
        setMaterialInput("")
        setColorInput("")
      }
    } catch (error: any) {
      console.error("❌ Erreur soumission:", error)
      toast.error("Erreur lors de la création du luminaire")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau luminaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <Label htmlFor="designer">Designer</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleInputChange("designer", e.target.value)}
                placeholder="Nom du designer"
              />
            </div>

            <div>
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="number"
                value={formData.annee}
                onChange={(e) => handleInputChange("annee", e.target.value)}
                placeholder="Année de création"
                min="1800"
                max="2030"
              />
            </div>

            <div>
              <Label htmlFor="periode">Période/Spécialité</Label>
              <Select value={formData.periode} onValueChange={(value) => handleInputChange("periode", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Art Déco">Art Déco</SelectItem>
                  <SelectItem value="Bauhaus">Bauhaus</SelectItem>
                  <SelectItem value="Mid-Century Modern">Mid-Century Modern</SelectItem>
                  <SelectItem value="Contemporain">Contemporain</SelectItem>
                  <SelectItem value="Industriel">Industriel</SelectItem>
                  <SelectItem value="Scandinave">Scandinave</SelectItem>
                  <SelectItem value="Vintage">Vintage</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CORRECTION 2: Champs Description et Collaboration complètement séparés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description du luminaire"
                rows={3}
              />
            </div>\
