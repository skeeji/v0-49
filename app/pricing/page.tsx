"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle, Zap, Eye } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { PremiumRequestModal } from "@/components/PremiumRequestModal"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { userData } = useAuth()

  const currentPlan = userData?.role || "free"

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choisissez votre forfait</h1>
          <p className="text-xl text-gray-600 mb-8">
            Accédez à toutes les fonctionnalités de notre galerie de luminaires
          </p>

          {/* Sélecteur de facturation */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${!isAnnual ? "font-semibold text-gray-900" : "text-gray-500"}`}>Mensuel</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-green-600" />
            <span className={`text-sm ${isAnnual ? "font-semibold text-gray-900" : "text-gray-500"}`}>
              Annuel
              <span className="ml-1 text-green-600 font-bold">(économisez 27%)</span>
            </span>
          </div>
        </div>

        {/* Cartes de forfaits */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Carte Gratuit */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Gratuit</CardTitle>
              <CardDescription>Pour découvrir notre collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-gray-500 ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Connexion obligatoire</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">3 recherches IA limitées (upload)</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas de suppression d'arrière-plan</span>
                </div>
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-orange-500" />
                  <span className="text-sm">10% des contenus visibles</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas de téléchargement PDF</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Pas de favoris</span>
                </div>
              </div>
              <Button className="w-full mt-6 bg-transparent" disabled variant="outline">
                {currentPlan === "free" ? "Votre forfait actuel" : "Forfait gratuit"}
              </Button>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">Recommandé</span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Premium
                <Zap className="w-6 h-6 text-yellow-500" />
              </CardTitle>
              <CardDescription>Accès complet à toutes les fonctionnalités</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€{isAnnual ? "22" : "30"}</span>
                <span className="text-gray-500 ml-2">/ mois</span>
                {isAnnual && <div className="text-sm text-green-600 font-semibold mt-1">Facturé €264 annuellement</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Recherches illimitées (upload & photo)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Suppression d'arrière-plan</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Visibilité illimitée</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Téléchargement PDF</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Ajout aux favoris</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Support prioritaire</span>
                </div>
              </div>
              <Button
                className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                onClick={() => setIsModalOpen(true)}
                disabled={currentPlan === "premium" || currentPlan === "admin"}
              >
                {currentPlan === "premium" || currentPlan === "admin" ? "Votre forfait actuel" : "Choisir Premium"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Garantie */}
        <div className="text-center mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Garantie de satisfaction</h3>
          <p className="text-gray-600">
            Essayez Premium sans risque. Nous offrons une garantie de remboursement de 30 jours.
          </p>
        </div>
      </div>

      {/* Modale de demande Premium */}
      <PremiumRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        billingType={isAnnual ? "annual" : "monthly"}
      />
    </div>
  )
}
