"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Send, CheckCircle } from "lucide-react"

interface PremiumRequestModalProps {
  isOpen: boolean
  onClose: () => void
  billingType: "monthly" | "annual"
}

export function PremiumRequestModal({ isOpen, onClose, billingType }: PremiumRequestModalProps) {
  const { user, userData } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: userData?.displayName || "",
    company: "",
    email: user?.email || "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simuler l'envoi de la demande
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Ici vous pourriez envoyer les données à votre API
      console.log("Demande d'abonnement:", {
        ...formData,
        billingType,
        userId: user?.uid,
        timestamp: new Date().toISOString(),
      })

      setIsSubmitted(true)
      toast.success("Votre demande a été envoyée avec succès !")

      // Fermer la modale après 3 secondes
      setTimeout(() => {
        onClose()
        setIsSubmitted(false)
        setFormData({
          fullName: userData?.displayName || "",
          company: "",
          email: user?.email || "",
          message: "",
        })
      }, 3000)
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
      toast.error("Erreur lors de l'envoi de votre demande")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <DialogTitle className="text-xl mb-2">Demande envoyée !</DialogTitle>
            <DialogDescription className="text-base">
              Nous avons bien reçu votre demande d'abonnement Premium. Notre équipe vous contactera dans les plus brefs
              délais.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demande d'abonnement Premium</DialogTitle>
          <DialogDescription>
            Après l'envoi de votre demande, nous vous contacterons pour finaliser la mise en place de votre abonnement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Votre nom complet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Société (optionnel)</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="Nom de votre société"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={formData.email} readOnly className="bg-gray-50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              placeholder="Dites-nous en plus sur vos besoins..."
              rows={4}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-sm mb-2">Récapitulatif de votre demande :</h4>
            <div className="text-sm text-gray-600">
              <p>
                • Forfait : <span className="font-semibold">Premium</span>
              </p>
              <p>
                • Facturation :{" "}
                <span className="font-semibold">
                  {billingType === "annual" ? "Annuelle (€22/mois)" : "Mensuelle (€30/mois)"}
                </span>
              </p>
              {billingType === "annual" && (
                <p className="text-green-600 font-semibold">• Économie : 27% par rapport au mensuel</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              disabled={isSubmitting || !formData.fullName.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
