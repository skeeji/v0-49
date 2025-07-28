"use client"

import { useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const freeFeatures = [
    "Limite de 3 recherches par mois",
    "Accès à 10% des luminaires et designers",
    "Recherche par image via upload uniquement",
    "Pas de suppression de l'arrière-plan",
    "Pas de téléchargement PDF",
    "Pas d'ajout aux favoris",
    "Pas d'accès à l'estimation de prix",
  ]

  const premiumFeatures = [
    "Recherches par image illimitées",
    "Accès à toute la collection",
    "Recherche via upload et prise de photo",
    "Suppression de l'arrière-plan",
    "Téléchargement des fiches en PDF",
    "Ajout aux favoris",
    "Accès à l'estimation de prix",
  ]

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Titre principal */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-gray-900 mb-4">Choisissez le forfait qui vous convient</h1>
          <p className="text-lg text-gray-600">
            Découvrez notre collection de luminaires avec le plan qui correspond à vos besoins
          </p>
        </div>

        {/* Sélecteur de facturation */}
        <div className="flex items-center justify-center space-x-4 mb-12">
          <Label htmlFor="billing-toggle" className="text-sm font-medium">
            Mensuel
          </Label>
          <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label htmlFor="billing-toggle" className="text-sm font-medium">
            Annuel (2 mois offerts)
          </Label>
        </div>

        {/* Cartes des forfaits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Carte Gratuit */}
          <Card className="relative">
            <CardHeader className="text-center pb-8">
              <CardTitle>
                <h2 className="text-2xl font-serif text-gray-900">Gratuit</h2>
              </CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€0</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button disabled className="w-full bg-transparent" variant="outline">
                Votre forfait actuel
              </Button>

              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-yellow-400 shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-medium">Recommandé</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle>
                <h2 className="text-2xl font-serif text-gray-900">Premium</h2>
              </CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€{isAnnual ? "22" : "30"}</span>
                <span className="text-gray-600 ml-2">/ mois</span>
              </div>
              {isAnnual && <p className="text-sm text-green-600 mt-2">Économisez €96 par an</p>}
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                className="w-full text-white"
                style={{ backgroundColor: "#f2d895" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
              >
                Passer à Premium
              </Button>

              <ul className="space-y-3">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Section FAQ ou informations supplémentaires */}
        <div className="text-center mt-16">
          <p className="text-gray-600">
            Vous avez des questions ? Contactez-nous pour plus d'informations sur nos forfaits.
          </p>
        </div>
      </div>
    </div>
  )
}
