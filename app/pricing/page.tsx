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
  const annualPrice = 22

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
    <div className="container-responsive py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-4">Nos plans d'adhésion</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez la collection la plus fabuleuse de luminaires rares et historiques
          </p>
        </div>

        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4 bg-beige rounded-xl p-1.5 border border-gold/20">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!isAnnual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Mensuel
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-gold" />
            <span
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isAnnual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Annuel (2 mois offerts)
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="relative border-2 border-border rounded-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif text-foreground">Accès Gratuit</CardTitle>
              <CardDescription className="text-muted-foreground">Découvrez notre collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">0€</span>
                <span className="text-muted-foreground ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button disabled className="w-full bg-transparent rounded-xl" variant="outline">
                Votre forfait actuel
              </Button>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-foreground">Accès limité à 10% de la collection</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-foreground">3 recherches IA maximum par mois</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-foreground">Recherche par upload uniquement</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-foreground">Pas de téléchargement ni favoris</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-border rounded-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif text-foreground">Essentiel</CardTitle>
              <CardDescription className="text-muted-foreground">Pour les amateurs éclairés</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">19€</span>
                <span className="text-muted-foreground ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gold hover:bg-gold-dark text-white rounded-xl">Bientôt disponible</Button>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Accès à 50% de la collection</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">50 recherches IA par mois</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Téléchargement de fiches en PDF</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Gestion des favoris</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-gold rounded-2xl shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-gold text-white px-4 py-1 rounded-full text-sm font-medium">Premium</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif text-foreground">Premium</CardTitle>
              <CardDescription className="text-muted-foreground">Accès illimité et complet</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">49€</span>
                <span className="text-muted-foreground ml-2">/ mois</span>
                {isAnnual && <div className="text-sm text-green-600 mt-1">Économisez 96€ par an</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gold hover:bg-gold-dark text-white rounded-xl">
                    Souscrire à l'abonnement
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
                      className="w-full bg-gold hover:bg-gold-dark text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-3 pt-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Accès illimité à toute la collection</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Recherches IA illimitées</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Recherche via caméra et upload</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Suppression d'arrière-plan automatique</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Téléchargement PDF et gestion favoris</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">Consultation d'experts personnalisée</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Des questions sur nos forfaits ? Contactez-nous pour plus d'informations.
          </p>
        </div>
      </div>
    </div>
  )
}
