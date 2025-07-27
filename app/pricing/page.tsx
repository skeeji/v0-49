"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle, Zap, Star } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { userData } = useAuth()

  const currentPlan = userData?.role || "free"

  // CORRECTION: Fonction pour gérer le passage à Premium
  const handleUpgradeToPremium = () => {
    // Simuler le passage à Premium (en réalité, cela devrait être une intégration de paiement)
    toast.success("Fonctionnalité de paiement à implémenter. Contactez l'administrateur pour passer à Premium.")

    // Pour la démo, on peut simuler le changement de rôle
    // Dans un vrai système, cela se ferait après le paiement
    /*
    if (userData) {
      const newUserData = { ...userData, role: "premium" }
      localStorage.setItem(`userData_${userData.uid}`, JSON.stringify(newUserData))
      window.location.reload()
    }
    */
  }

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
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-blue-600" />
            <span className={`text-sm ${isAnnual ? "font-semibold text-gray-900" : "text-gray-500"}`}>
              Annuel
              <span className="ml-1 text-green-600 font-bold">(économisez 27%)</span>
            </span>
          </div>
        </div>

        {/* Cartes de forfaits */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Carte Gratuit */}
          <Card className="relative border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Gratuit</CardTitle>
              <CardDescription>Pour découvrir notre collection</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€0</span>
                <span className="text-gray-500 ml-2">/ mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">3 recherches IA par mois</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">10% des contenus visibles</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">Pas de téléchargement PDF</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">Pas de suppression d'arrière-plan</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">Pas d'estimation</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700">Pas de favoris</span>
                </div>
              </div>
              <Button className="w-full mt-6 bg-transparent" disabled variant="outline">
                {currentPlan === "free" ? "Votre forfait actuel" : "Forfait gratuit"}
              </Button>
            </CardContent>
          </Card>

          {/* Carte Premium */}
          <Card className="relative border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Star className="w-4 h-4" />
                Recommandé
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                Premium
                <Zap className="w-6 h-6 text-blue-500" />
              </CardTitle>
              <CardDescription>Accès complet à toutes les fonctionnalités</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€{isAnnual ? "22" : "30"}</span>
                <span className="text-gray-500 ml-2">/ mois</span>
                {isAnnual && <div className="text-sm text-green-600 font-semibold mt-1">Facturé €264 annuellement</div>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Recherches illimitées</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Tous les contenus visibles</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Téléchargement PDF</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Suppression d'arrière-plan</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Estimation des pièces</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Système de favoris</span>
                </div>
              </div>
              <Button
                className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                disabled={currentPlan === "premium" || currentPlan === "admin"}
                onClick={handleUpgradeToPremium}
              >
                {currentPlan === "premium" || currentPlan === "admin" ? "Votre forfait actuel" : "Choisir Premium"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section informative */}
        <div className="text-center mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Pourquoi choisir Premium ?</h3>
          <p className="text-gray-600">
            Débloquez toutes les fonctionnalités avancées et profitez d'une expérience complète pour explorer notre
            collection de luminaires de designers.
          </p>
        </div>
      </div>
    </div>
  )
}
