"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface LuminaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (luminaire: any) => void
}

export function LuminaireFormModal({ isOpen, onClose, onSave }: LuminaireFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    year: "",
    specialty: "",
    collaboration: "",
    signed: "",
    filename: "",
    image: "",
    dimensions: "",
    estimation: "",
    materials: "",
    description: "",
    url: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    setFormData({
      name: "",
      artist: "",
      year: "",
      specialty: "",
      collaboration: "",
      signed: "",
      filename: "",
      image: "",
      dimensions: "",
      estimation: "",
      materials: "",
      description: "",
      url: "",
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setFormData({ ...formData, image: imageUrl, filename: file.name })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-playfair text-dark">Ajouter un luminaire</h2>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du luminaire *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Artiste / Dates</label>
                <Input value={formData.artist} onChange={(e) => setFormData({ ...formData, artist: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <Input value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Signé</label>
                <Input value={formData.signed} onChange={(e) => setFormData({ ...formData, signed: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                <Input
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="ex: H 45cm x L 30cm x P 25cm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimation</label>
                <Input
                  value={formData.estimation}
                  onChange={(e) => setFormData({ ...formData, estimation: e.target.value })}
                  placeholder="ex: 1500€ - 2000€"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lien internet</label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://exemple.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Collaboration / Œuvre</label>
              <Textarea
                value={formData.collaboration}
                onChange={(e) => setFormData({ ...formData, collaboration: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Matériaux</label>
              <Textarea
                value={formData.materials}
                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                placeholder="ex: Bronze doré, cristal, laiton..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du luminaire..."
                rows={3}
              />
            </div>

            {formData.image && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aperçu de l'image</label>
                <img
                  src={formData.image || "/placeholder.svg"}
                  alt="Aperçu"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600">
                Ajouter le luminaire
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
