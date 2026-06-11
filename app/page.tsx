"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import MobileFooter from "@/components/MobileFooter"
import { PaintingSearchOverlay } from "@/components/PaintingSearchOverlay"
import { PaintingGallery } from "@/components/PaintingGallery"
import { CategorySection } from "@/components/CategorySection"
import { DesignerCarousel } from "@/components/DesignerCarousel"
import { ChronoSection } from "@/components/ChronoSection"

// ─── Citation décorative inter-section ──────────────────────────────────────────
function SectionQuote({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      background: "#f5f1e8",
      padding: "3.5rem 2rem",
      textAlign: "center",
    }}>
      <h2 style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontStyle:  "italic",
        fontWeight: 400,
        fontSize:   "clamp(1.8rem, 4vw, 2.6rem)",
        color:      "#1a1209",
        margin:     "0 0 1rem",
        lineHeight: 1.2,
      }}>
        {title}
      </h2>
      <p style={{
        fontFamily: "Georgia, serif",
        fontSize:   "clamp(0.85rem, 1.5vw, 1rem)",
        color:      "#4a3f35",
        maxWidth:   540,
        margin:     "0 auto",
        lineHeight: 1.65,
      }}>
        {subtitle}
      </p>
    </div>
  )
}

export default function HomePage() {
  const [previewDesigners, setPreviewDesigners] = useState<any[]>([])
  const [homepageImages,   setHomepageImages]   = useState<Record<string, string>>({})
  const [showLoginModal,   setShowLoginModal]   = useState(false)

  // Catégories : images statiques depuis homepageImages, pas besoin de tous les luminaires
  const [luminaireSample,  setLuminaireSample]  = useState<any[]>([])

  const { user } = useAuth()

  useEffect(() => {
    // 1. Images d'accueil en priorité absolue — débloque PaintingGallery + CategorySection + Chrono
    fetch("/api/homepage-images")
      .then(r => r.json())
      .then(data => {
        if (data.success && data.images) setHomepageImages(data.images)
      })
      .catch(() => {})

    // 2 & 3. Designers + luminaires différés après le rendu initial pour ne pas bloquer
    const timer = setTimeout(() => {
      fetch("/api/designers?limit=20")
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPreviewDesigners(
              (data.designers as any[]).filter((d: any) => d.image).slice(0, 16)
            )
          }
        })
        .catch(() => {})

      fetch("/api/luminaires-light?limit=18")
        .then(r => r.json())
        .then(data => { if (data.success) setLuminaireSample(data.luminaires) })
        .catch(() => {})
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-[#f5f1e8]">

      {/* ── Galerie tableau peinture + overlay recherche ── */}
      <div style={{ position: "relative" }}>
        <PaintingGallery transparentUrl={homepageImages["homepage_painting_transparent"]} />
        <div style={{ position: "absolute", inset: 0, zIndex: 25, pointerEvents: "none" }}>
          <PaintingSearchOverlay />
        </div>
      </div>

      {/* ── Sections principales ── */}
      <div className="relative z-10 bg-[#f5f1e8]">

        <CategorySection luminaires={luminaireSample} homepageImages={homepageImages} />

        <SectionQuote
          title="Les artisans de lumière"
          subtitle="Des créateurs qui ont redéfini l'art de l'éclairage, de l'atelier parisien à l'icône du design mondial."
        />

        <DesignerCarousel designers={previewDesigners} />

        <SectionQuote
          title="À travers les siècles"
          subtitle="De la bougie de cire aux LED contemporaines, chaque époque a inventé sa propre façon d'apprivoiser la lumière."
        />

        <ChronoSection homepageImages={homepageImages} />

      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <MobileFooter />

    </div>
  )
}
