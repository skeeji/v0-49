"use client"

import { useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { userData } = useAuth()

  const handleUpgradeToPremium = () => {
    toast.info("Contactez l'administrateur pour passer à Premium")
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Titre principal */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choisissez le forfait qui vous convient</h1>
          <p className="text-xl text-gray-600">Accédez à notre collection complète de luminaires avec Premium</p>
        </div>

        {/* Sélecteur de facturation */}
        <div className="flex items-center justify-center space-x-4 mb-12">
          <Label htmlFor="billing-switch" className="text-lg">
            Mensuel
          </Label>
          <Switch id="billing-switch" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label htmlFor="billing-switch" className="text-lg">
            Annuel <span className="text-green-600 font-semibold">(2 mois offerts)</span>
          </Label>
        </div>

        {/* Cartes des forfaits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Carte Gratuit */}
          <Card className="relative">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Gratuit</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold text-gray-900">€0</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button disabled className="w-full bg-transparent" variant="outline">
                Votre forfait actuel
              </Button>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Limite de 3 recherches par mois</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Accès à 10% des luminaires et designers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Recherche par image via upload uniquement</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas de suppression de l'arrière-plan</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas de téléchargement PDF</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas d'ajout aux favoris</span>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas d'accès à l'estimation de prix</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-blue-500 shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Recommandé</span>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Premium</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold text-gray-900">€{isAnnual ? "22" : "30"}</span>
                <span className="text-lg text-gray-600"> / mois</span>
                {isAnnual && <div className="text-sm text-green-600 mt-1">Facturé €264 annuellement</div>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={handleUpgradeToPremium} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Passer à Premium
              </Button>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Recherches par image illimitées</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Accès à toute la collection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Recherche via upload et prise de photo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Suppression de l'arrière-plan</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Téléchargement des fiches en PDF</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Ajout aux favoris</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Accès à l'estimation de prix</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message informatif */}
        <div className="text-center mt-12">
          <p className="text-gray-600">Besoin d'aide ? Contactez notre équipe pour plus d'informations.</p>
        </div>
      </div>
    </div>
  )
}
