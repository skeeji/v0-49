"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle } from "lucide-react"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const monthlyPrice = 30
  const annualPrice = 22 // 2 mois offerts

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
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
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-orange-500" />
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
          <Card className="relative border-2 border-orange-500 shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">Recommandé</span>
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
              <Button
                className="w-full text-white"
                style={{ backgroundColor: "#f2d895" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
              >
                Passer à Premium
              </Button>

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
    </div>
  )
}
