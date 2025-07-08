"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload, ImageIcon } from "lucide-react"
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
    description: "",
    collaboration: "",
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

  const resetForm = () => {
    setFormData({
      nom: "",
      designer: "",
      annee: "",
      periode: "",
      description: "",
      collaboration: "",
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (designerImageInputRef.current) {
      designerImageInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("🚀 Début de la soumission du formulaire")
      console.log("📊 Données du formulaire:", formData)

      // Validation
      if (!formData.nom.trim()) {
        toast.error("Le nom du luminaire est requis")
        setIsSubmitting(false)
        return
      }

      // Upload des images principales
      let uploadedImages: string[] = []
      if (images.length > 0) {
        console.log(`📸 Upload de ${images.length} images principales...`)
        const imageFormData = new FormData()
        images.forEach((image) => {
          imageFormData.append("images", image)
        })

        const imageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: imageFormData,
        })

        const imageData = await imageResponse.json()
        console.log("📸 Réponse upload images:", imageData)

        if (imageData.success) {
          uploadedImages = imageData.filenames || []
          console.log("✅ Images uploadées:", uploadedImages)
        } else {
          throw new Error(`Erreur lors de l'upload des images: ${imageData.error}`)
        }
      }

      // Upload de l'image designer
      let designerImageFilename = ""
      if (designerImage) {
        console.log("👤 Upload de l'image designer...")
        const designerFormData = new FormData()
        designerFormData.append("images", designerImage)
        designerFormData.append("designer", formData.designer)

        const designerImageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: designerFormData,
        })

        const designerImageData = await designerImageResponse.json()
        console.log("👤 Réponse upload image designer:", designerImageData)

        if (designerImageData.success && designerImageData.filenames && designerImageData.filenames.length > 0) {
          designerImageFilename = designerImageData.filenames[0]
          console.log("✅ Image designer uploadée:", designerImageFilename)
        }
      }

      // ÉTAPE 1 : Structure simple et cohérente
      const luminaireData = {
        // Champs textuels simples
        nom: formData.nom.trim(),
        designer: formData.designer.trim(),
        annee: formData.annee.trim(),
        periode: formData.periode.trim(), // Champ unique pour "Spécialité"
        description: formData.description.trim(),
        collaboration: formData.collaboration.trim(), // Champ unique pour "Collaboration"
        signe: formData.signe,
        editeur: formData.editeur.trim(),
        dimensions: formData.dimensions.trim(),
        estimation: formData.estimation.trim(),

        // Champs de type tableau
        materiaux: formData.materiaux, // Doit être un tableau
        couleurs: formData.couleurs,

        // Noms des fichiers image (ceci est correct)
        images: uploadedImages,
        designerImageFilename: designerImageFilename,
      }

      console.log("💾 Données à sauvegarder:", luminaireData)

      // Soumettre le luminaire
      const result = await onSubmit(luminaireData)
      console.log("💾 Résultat de la soumission:", result)

      if (result.success) {
        toast.success("Luminaire créé avec succès!")
        resetForm()
        onClose()
      } else {
        throw new Error(result.error || "Erreur lors de la création")
      }
    } catch (error: any) {
      console.error("❌ Erreur soumission:", error)
      toast.error(`Erreur lors de la création du luminaire: ${error.message}`)
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
                type="text"
                value={formData.annee}
                onChange={(e) => handleInputChange("annee", e.target.value)}
                placeholder="Année de création"
              />
            </div>

            <div>
              <Label htmlFor="periode">Période/Spécialité</Label>
              <Input
                id="periode"
                value={formData.periode}
                onChange={(e) => handleInputChange("periode", e.target.value)}
                placeholder="Période ou spécialité"
              />
            </div>
          </div>

          {/* Description et Collaboration séparés */}
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
            </div>

            <div>
              <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
              <Textarea
                id="collaboration"
                value={formData.collaboration}
                onChange={(e) => handleInputChange("collaboration", e.target.value)}
                placeholder="Informations sur la collaboration ou l'œuvre"
                rows={3}
              />
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signe">Signé</Label>
              <Select value={formData.signe} onValueChange={(value) => handleInputChange("signe", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Le luminaire est-il signé ?" />
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
              <Label htmlFor="editeur">Éditeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => handleInputChange("editeur", e.target.value)}
                placeholder="Éditeur ou fabricant"
              />
            </div>

            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
                placeholder="ex: H 50cm x L 30cm x P 20cm"
              />
            </div>

            <div>
              <Label htmlFor="estimation">Prix / Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => handleInputChange("estimation", e.target.value)}
                placeholder="Prix ou estimation"
              />
            </div>
          </div>

          {/* Matériaux */}
          <div>
            <Label>Matériaux</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                placeholder="Ajouter un matériau"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMaterial())}
              />
              <Button type="button" onClick={addMaterial} variant="outline">
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.materiaux.map((material) => (
                <Badge key={material} variant="secondary" className="flex items-center gap-1">
                  {material}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeMaterial(material)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Couleurs */}
          <div>
            <Label>Couleurs</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder="Ajouter une couleur"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
              />
              <Button type="button" onClick={addColor} variant="outline">
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.couleurs.map((color) => (
                <Badge key={color} variant="secondary" className="flex items-center gap-1">
                  {color}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeColor(color)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Upload d'images principales */}
          <div>
            <Label>Images du luminaire</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner des images
                </Button>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG jusqu'à 10MB chacune</p>
              </div>

              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{images.length} image(s) sélectionnée(s):</p>
                  <div className="space-y-2">
                    {images.map((image, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{image.name}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeImage(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload image designer */}
          <div>
            <Label>Image du designer</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={designerImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleDesignerImageUpload}
                className="hidden"
              />
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <Button type="button" onClick={() => designerImageInputRef.current?.click()} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner l'image du designer
                </Button>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG jusqu'à 5MB</p>
              </div>

              {designerImage && (
                <div className="mt-4">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm truncate">{designerImage.name}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={removeDesignerImage}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4 pt-4 border-t">
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
