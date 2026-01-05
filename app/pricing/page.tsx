"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import MobileFooter from "@/components/MobileFooter"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    duree: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const monthlyPrice = 30
  const annualPrice = 22 // 2 mois offerts

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      message:
        field === "duree" && value
          ? `Bonjour, Je souhaite avoir un abonnement premium pour une durée de ${value}.`
          : prev.message,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/send-premium-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert("Votre demande a été envoyée avec succès !")
        setIsDialogOpen(false)
        setFormData({
          nom: "",
          prenom: "",
          email: "",
          telephone: "",
          duree: "",
          message: "",
        })
      } else {
        alert("Erreur lors de l'envoi de la demande")
      }
    } catch (error) {
      alert("Erreur lors de l'envoi de la demande")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8]">
      <div className="container mx-auto px-4 py-16">
        {/* Titre principal */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
            Choisissez le forfait qui vous convient
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Découvrez notre collection complète de luminaires avec des fonctionnalités avancées
          </p>
        </div>

        {/* Sélecteur de facturation */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4 bg-gray-100 rounded-lg p-1">
            <span className={`px-4 py-2 text-sm font-medium ${!isAnnual ? "text-gray-900" : "text-gray-500"}`}>
              Mensuel
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-[#8b7355]" />
            <span className={`px-4 py-2 text-sm font-medium ${isAnnual ? "text-gray-900" : "text-gray-500"}`}>
              Annuel (2 mois offerts)
            </span>
          </div>
        </div>

        {/* Cartes des forfaits */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Carte Gratuit */}
          <Card className="relative">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif">Gratuit</CardTitle>
              <CardDescription className="text-gray-600">Découvrez notre collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-gray-600 ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button disabled className="w-full bg-transparent" variant="outline">
                Votre forfait actuel
              </Button>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Limite de 3 recherches par mois</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Accès à 10% des luminaires et designers</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Recherche par image via upload uniquement</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Pas de suppression de l'arrière-plan</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Pas de téléchargement PDF</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Pas d'ajout aux favoris</span>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Pas d'accès à l'estimation de prix</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-[#8b7355] shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-[#8b7355] text-white px-4 py-1 rounded-full text-sm font-medium">Recommandé</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif">Premium</CardTitle>
              <CardDescription className="text-gray-600">Accès complet à toutes les fonctionnalités</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€{isAnnual ? annualPrice : monthlyPrice}</span>
                <span className="text-gray-600 ml-2">/ mois</span>
                {isAnnual && <div className="text-sm text-green-600 mt-1">Économisez €96 par an</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full text-white"
                    style={{ backgroundColor: "#8b7355" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6d5c44")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                  >
                    Passer à Premium
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Demande d'abonnement Premium</DialogTitle>
                    <DialogDescription>Remplissez ce formulaire pour demander un abonnement Premium</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nom">Nom *</Label>
                        <Input
                          id="nom"
                          value={formData.nom}
                          onChange={(e) => handleInputChange("nom", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="prenom">Prénom *</Label>
                        <Input
                          id="prenom"
                          value={formData.prenom}
                          onChange={(e) => handleInputChange("prenom", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Adresse email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="telephone">Téléphone *</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) => handleInputChange("telephone", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duree">Durée souhaitée *</Label>
                      <Select onValueChange={(value) => handleInputChange("duree", value)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une durée" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 mois">1 mois</SelectItem>
                          <SelectItem value="3 mois">3 mois</SelectItem>
                          <SelectItem value="6 mois">6 mois</SelectItem>
                          <SelectItem value="1 an">1 an</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange("message", e.target.value)}
                        rows={3}
                        readOnly
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full text-white hover:bg-[#6d5c44]"
                      disabled={isSubmitting}
                      style={{ backgroundColor: "#8b7355" }}
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Recherches par image illimitées</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Accès à toute la collection</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Recherche via upload et prise de photo</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Suppression de l'arrière-plan</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Téléchargement des fiches en PDF</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Ajout aux favoris</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Accès à l'estimation de prix</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ ou informations supplémentaires */}
        <div className="text-center mt-12">
          <p className="text-gray-600">Questions ? Contactez-nous pour plus d'informations sur nos forfaits.</p>
        </div>
      </div>
      <MobileFooter />
    </div>
  )
}
