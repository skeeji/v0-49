"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const CREAM = "#f5f1e8"
const TEXT  = "#1a1209"
const MUTED = "#4a3f35"
const LINE  = "#d8d0c0"
const BROWN = "#8b7355"

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "Accès aux luminaires de la collection",     included: true  },
  { label: "Recherche par texte",                      included: true  },
  { label: "Recherche par image (3 / mois)",           included: false },
  { label: "Accès à toute la collection de designers", included: false },
  { label: "Suppression de l'arrière-plan",            included: false },
  { label: "Téléchargement des fiches en PDF",         included: false },
  { label: "Favoris illimités",                        included: false },
  { label: "Estimation de prix",                       included: false },
]

const PREMIUM_FEATURES: { label: string; included: boolean }[] = [
  { label: "Accès aux luminaires de la collection",     included: true },
  { label: "Recherche par texte",                      included: true },
  { label: "Recherche par image illimitée",            included: true },
  { label: "Accès à toute la collection de designers", included: true },
  { label: "Suppression de l'arrière-plan",            included: true },
  { label: "Téléchargement des fiches en PDF",         included: true },
  { label: "Favoris illimités",                        included: true },
  { label: "Estimation de prix",                       included: true },
]

export default function PricingPage() {
  const [isAnnual,     setIsAnnual]     = useState(false)
  const [contribution, setContribution] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData,     setFormData]     = useState({ nom: "", prenom: "", email: "", telephone: "", message: "" })
  const [pageHeight,   setPageHeight]   = useState<string>("auto")

  const monthly = contribution
  const annual  = Math.round(contribution * 10)

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 768) {
        const header = document.querySelector("header")
        const h = header ? header.getBoundingClientRect().height : 112
        setPageHeight(`${window.innerHeight - h}px`)
      } else {
        setPageHeight("auto")
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const handleInput = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/send-premium-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, contribution: isAnnual ? annual : monthly, periode: isAnnual ? "annuel" : "mensuel" }),
      })
      if (res.ok) {
        alert("Votre demande a été envoyée avec succès !")
        setIsDialogOpen(false)
        setFormData({ nom: "", prenom: "", email: "", telephone: "", message: "" })
      } else {
        alert("Erreur lors de l'envoi de la demande")
      }
    } catch {
      alert("Erreur lors de l'envoi de la demande")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ background: CREAM, height: pageHeight, overflow: "hidden" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.4rem 1.5rem 1rem" }}>

        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 400, color: TEXT, margin: 0, lineHeight: 1.2 }}>
            Accès Premium
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.8rem auto 0", maxWidth: 220 }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span style={{ color: BROWN, fontSize: "0.8rem" }}>✦</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
          </div>
        </div>

        {/* Toggle Mensuel / Annuel */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div style={{ display: "inline-flex", background: "#ede8df", borderRadius: 40, padding: 3, gap: 3 }}>
            {(["Mensuel", "Annuel"] as const).map((label) => {
              const active = (label === "Annuel") === isAnnual
              return (
                <button
                  key={label}
                  onClick={() => setIsAnnual(label === "Annuel")}
                  style={{
                    padding: "0.4rem 1.2rem",
                    borderRadius: 36,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                    fontSize: "0.8rem",
                    background: active ? BROWN : "transparent",
                    color: active ? CREAM : MUTED,
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Carte */}
        <div style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: "1.4rem 2rem", position: "relative", boxShadow: "0 4px 24px rgba(26,18,9,0.06)" }}>

          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: "1.1rem", color: TEXT, margin: "0 0 0.25rem", fontWeight: 400 }}>
              Soutien au Développement et Accès Premium
            </p>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "0.78rem", color: MUTED, margin: 0 }}>
              Le site est en construction — votre participation libre nous aide à grandir
            </p>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "0.76rem", color: MUTED }}>
                Participation {isAnnual ? "annuelle" : "mensuelle"}
              </span>
              <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: "1.35rem", color: BROWN, fontWeight: 400 }}>
                {isAnnual ? annual : monthly} €
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={contribution}
              onChange={(e) => setContribution(Number(e.target.value))}
              style={{ width: "100%", accentColor: BROWN, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.15rem" }}>
              <span style={{ fontSize: "0.68rem", color: MUTED, fontFamily: "Georgia, serif" }}>5 €</span>
              <span style={{ fontSize: "0.68rem", color: MUTED, fontFamily: "Georgia, serif" }}>50 €</span>
            </div>
          </div>

          {/* Comparatif */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
            <div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "0.7rem", letterSpacing: "0.1em", color: MUTED, textTransform: "uppercase", marginBottom: "0.5rem", textAlign: "center" }}>
                Sans contribution
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {FREE_FEATURES.map((f) => (
                  <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                    {f.included
                      ? <CheckCircle style={{ width: 13, height: 13, color: BROWN, flexShrink: 0, marginTop: 1 }} />
                      : <XCircle    style={{ width: 13, height: 13, color: "#c8b89a", flexShrink: 0, marginTop: 1 }} />
                    }
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "0.73rem", color: f.included ? TEXT : "#a89880", lineHeight: 1.35 }}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: "1rem" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "0.7rem", letterSpacing: "0.1em", color: BROWN, textTransform: "uppercase", marginBottom: "0.5rem", textAlign: "center" }}>
                Avec votre soutien
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {PREMIUM_FEATURES.map((f) => (
                  <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                    <CheckCircle style={{ width: 13, height: 13, color: BROWN, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "0.73rem", color: TEXT, lineHeight: 1.35 }}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                style={{
                  width: "100%",
                  padding: "0.7rem 2rem",
                  background: BROWN,
                  color: CREAM,
                  border: "none",
                  borderRadius: 7,
                  fontFamily: "Georgia, serif",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#6d5c44")}
                onMouseLeave={(e) => (e.currentTarget.style.background = BROWN)}
              >
                Confirmer ma participation et débloquer Premium
              </button>
            </DialogTrigger>
            <DialogContent style={{ background: CREAM, borderColor: LINE }}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, color: TEXT }}>
                  Votre participation
                </DialogTitle>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "0.85rem", color: MUTED }}>
                  {isAnnual ? annual : monthly} € / {isAnnual ? "an" : "mois"} — merci pour votre soutien
                </p>
              </DialogHeader>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <Label htmlFor="nom" style={{ fontFamily: "Georgia, serif", fontSize: "0.8rem", color: MUTED }}>Nom *</Label>
                    <Input id="nom" value={formData.nom} onChange={(e) => handleInput("nom", e.target.value)} required style={{ background: "#fff", borderColor: LINE }} />
                  </div>
                  <div>
                    <Label htmlFor="prenom" style={{ fontFamily: "Georgia, serif", fontSize: "0.8rem", color: MUTED }}>Prénom *</Label>
                    <Input id="prenom" value={formData.prenom} onChange={(e) => handleInput("prenom", e.target.value)} required style={{ background: "#fff", borderColor: LINE }} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" style={{ fontFamily: "Georgia, serif", fontSize: "0.8rem", color: MUTED }}>Adresse email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInput("email", e.target.value)} required style={{ background: "#fff", borderColor: LINE }} />
                </div>
                <div>
                  <Label htmlFor="telephone" style={{ fontFamily: "Georgia, serif", fontSize: "0.8rem", color: MUTED }}>Téléphone</Label>
                  <Input id="telephone" type="tel" value={formData.telephone} onChange={(e) => handleInput("telephone", e.target.value)} style={{ background: "#fff", borderColor: LINE }} />
                </div>
                <div>
                  <Label htmlFor="message" style={{ fontFamily: "Georgia, serif", fontSize: "0.8rem", color: MUTED }}>Message (optionnel)</Label>
                  <Textarea id="message" value={formData.message} onChange={(e) => handleInput("message", e.target.value)} rows={3} style={{ background: "#fff", borderColor: LINE }} />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: "0.75rem", background: BROWN, color: CREAM, border: "none", borderRadius: 6, fontFamily: "Georgia, serif", fontSize: "0.9rem", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <p style={{ textAlign: "center", fontFamily: "Georgia, serif", fontSize: "0.72rem", color: MUTED, marginTop: "0.8rem" }}>
          Questions ? Contactez-nous pour plus d&rsquo;informations.
        </p>

      </div>
    </div>
  )
}
