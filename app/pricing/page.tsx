"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle } from "lucide-react"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const freeFeatures = [
    { text: "Limite de 3 recherches par mois", included: false },
    { text: "Accès à 10% des luminaires et designers", included: false },
    { text: "Recherche par image via upload uniquement", included: false },
    { text: "Pas de suppression de l'arrière-plan", included: false },
    { text: "Pas de téléchargement PDF", included: false },
    { text: "Pas d'ajout aux favoris", included: false },
    { text: "Pas d'accès à l'estimation de prix", included: false },
  ]

  const premiumFeatures = [
    { text: "Recherches par image illimitées", included: true },
    { text: "Accès à toute la collection", included: true },
    { text: "Recherche via upload et prise de photo", included: true },
    { text: "Suppression de l'arrière-plan", included: true },
    { text: "Téléchargement des fiches en PDF", included: true },
    { text: "Ajout aux favoris", included: true },
    { text: "Accès à l'estimation de prix", included: true },
  ]

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
            Choisissez le forfait qui vous convient
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Découvrez notre collection de luminaires avec l'abonnement qui correspond à vos besoins
          </p>

          {/* Sélecteur de facturation */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-lg font-medium ${!isAnnual ? "text-gray-900" : "text-gray-500"}`}>Mensuel</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-orange-500" />
            <span className={`text-lg font-medium ${isAnnual ? "text-gray-900" : "text-gray-500"}`}>
              Annuel (2 mois offerts)
            </span>
          </div>
        </div>

        {/* Cartes des forfaits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Carte Gratuit */}
          <Card className="relative">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif text-gray-900">Gratuit</CardTitle>
              <CardDescription className="text-lg">Pour découvrir notre collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€0</span>
                <span className="text-gray-600 ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button disabled className="w-full py-3 text-lg bg-gray-300 text-gray-500 cursor-not-allowed">
                Votre forfait actuel
              </Button>

              <div className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-orange-500 shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium">Recommandé</span>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif text-gray-900">Premium</CardTitle>
              <CardDescription className="text-lg">Accès complet à toute la collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€{isAnnual ? "22" : "30"}</span>
                <span className="text-gray-600 ml-2">/ mois</span>
                {isAnnual && <div className="text-sm text-green-600 font-medium mt-1">Économisez €96 par an</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                className="w-full py-3 text-lg text-white transition-all duration-200 hover:shadow-lg"
                style={{ backgroundColor: "#f2d895" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6c77a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f2d895")}
              >
                Passer à Premium
              </Button>

              <div className="space-y-3">
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section FAQ ou informations supplémentaires */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Questions fréquentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Puis-je changer de forfait à tout moment ?</h3>
              <p className="text-gray-600">
                Oui, vous pouvez passer à Premium ou annuler votre abonnement à tout moment depuis votre compte.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Comment fonctionne la recherche par image ?</h3>
              <p className="text-gray-600">
                Notre IA analyse votre photo et trouve les luminaires les plus similaires dans notre collection de
                milliers d'objets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
