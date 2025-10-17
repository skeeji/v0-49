"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LuminaireFormModalProps {
  onSuccess?: () => void
}

export function LuminaireFormModal({ onSuccess }: LuminaireFormModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    annee: "",
    periode: "",
    categorie: "",
    editeur: "",
    collaboration: "",
    description: "",
    signe: "",
    dimensions: "",
    materiaux: "",
    estimation: "",
    lienSiteMarchand: "",
    etiquette: "",
    bibliographie: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("📝 Envoi des données du formulaire:", formData)

      // Convertir les matériaux en tableau s'ils sont séparés par des virgules
      const materiauxArray = formData.materiaux
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0)

      const dataToSend = {
        // Champs normalisés (utilisés par l'application)
        nom: formData.nom,
        designer: formData.designer,
        annee: formData.annee,
        periode: formData.periode,
        categorie: formData.categorie,
        editeur: formData.editeur,
        collaboration: formData.collaboration,
        description: formData.description,
        signe: formData.signe,
        dimensions: formData.dimensions,
        materiaux: materiauxArray,
        estimation: formData.estimation,
        lienSiteMarchand: formData.lienSiteMarchand,
        etiquette: formData.etiquette,
        bibliographie: formData.bibliographie,

        // Champs CSV originaux (pour compatibilité avec l'export)
        "Nom luminaire": formData.nom,
        "Artiste / Dates": formData.designer,
        Année: formData.annee,
        Spécialité: formData.periode,
        Catégorie: formData.categorie,
        Editeur: formData.editeur,
        "Collaboration / Œuvre": formData.collaboration,
        Description: formData.description,
        Signé: formData.signe,
        Dimensions: formData.dimensions,
        Matériaux: materiauxArray.join(", "),
        Estimation: formData.estimation,
        "Lien site marchand": formData.lienSiteMarchand,
        Etiquette: formData.etiquette,
        Bibliographie: formData.bibliographie,
      }

      console.log("📤 Données envoyées à l'API:", dataToSend)

      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      })

      const result = await response.json()
      console.log("📊 Réponse de l'API:", result)

      if (result.success) {
        toast({
          title: "✅ Luminaire créé",
          description: "Le luminaire a été créé avec succès",
        })

        // Réinitialiser le formulaire
        setFormData({
          nom: "",
          designer: "",
          annee: "",
          periode: "",
          categorie: "",
          editeur: "",
          collaboration: "",
          description: "",
          signe: "",
          dimensions: "",
          materiaux: "",
          estimation: "",
          lienSiteMarchand: "",
          etiquette: "",
          bibliographie: "",
        })

        setOpen(false)

        if (onSuccess) {
          onSuccess()
        }
      } else {
        throw new Error(result.error || "Erreur lors de la création")
      }
    } catch (error: any) {
      console.error("❌ Erreur création luminaire:", error)
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de créer le luminaire",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau Luminaire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau luminaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du luminaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designer">Artiste / Dates *</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                value={formData.annee}
                onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input
                id="categorie"
                placeholder="suspension, applique, lampe de table..."
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editeur">Editeur</Label>
              <Input
                id="editeur"
                value={formData.editeur}
                onChange={(e) => setFormData({ ...formData, editeur: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signe">Signé</Label>
              <Input
                id="signe"
                value={formData.signe}
                onChange={(e) => setFormData({ ...formData, signe: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimation">Estimation</Label>
              <Input
                id="estimation"
                value={formData.estimation}
                onChange={(e) => setFormData({ ...formData, estimation: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periode">Spécialité</Label>
            <Input
              id="periode"
              value={formData.periode}
              onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collaboration">Collaboration / Œuvre</Label>
            <Textarea
              id="collaboration"
              value={formData.collaboration}
              onChange={(e) => setFormData({ ...formData, collaboration: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="materiaux">Matériaux (séparés par des virgules)</Label>
            <Input
              id="materiaux"
              placeholder="Bronze, Verre, Laiton"
              value={formData.materiaux}
              onChange={(e) => setFormData({ ...formData, materiaux: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lienSiteMarchand">Lien site marchand</Label>
            <Input
              id="lienSiteMarchand"
              type="url"
              placeholder="https://exemple.com/produit"
              value={formData.lienSiteMarchand}
              onChange={(e) => setFormData({ ...formData, lienSiteMarchand: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etiquette">Étiquette</Label>
            <Textarea
              id="etiquette"
              value={formData.etiquette}
              onChange={(e) => setFormData({ ...formData, etiquette: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bibliographie">Bibliographie</Label>
            <Textarea
              id="bibliographie"
              value={formData.bibliographie}
              onChange={(e) => setFormData({ ...formData, bibliographie: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
