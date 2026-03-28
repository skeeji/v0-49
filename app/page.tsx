"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import MobileFooter from "@/components/MobileFooter"
// import { CorridorGallery } from "@/components/CorridorGallery"  // ← rollback: décommenter cette ligne et commenter la suivante
import { FloatingGallery } from "@/components/FloatingGallery"
import { CategorySection } from "@/components/CategorySection"
import { DesignerCarousel } from "@/components/DesignerCarousel"
import { ChronoSection } from "@/components/ChronoSection"
import { PricingSection } from "@/components/PricingSection"

const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  const [luminaires,      setLuminaires]      = useState<any[]>([])
  const [previewDesigners, setPreviewDesigners] = useState<any[]>([])
  const [homepageImages,  setHomepageImages]  = useState<Record<string, string>>({})
  const [homepageMeta,    setHomepageMeta]    = useState<Record<string, any>>({})
  const [showLoginModal,  setShowLoginModal]  = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    // Charger les luminaires (payload léger)
    const loadLuminaires = async () => {
      try {
        const res = await fetch("/api/luminaires-light")
        if (res.ok) {
          const data = await res.json()
          if (data.success) setLuminaires(data.luminaires)
        }
      } catch {}
    }

    // Charger des designers célèbres pour la preview
    const loadDesigners = async () => {
      try {
        const knownNames = [
          "Starck", "Tom Dixon", "Royere", "Ingo Maurer", "Flos",
          "Artemide", "Le Corbusier", "Charlotte Perriand", "Serge Mouille", "Jean Prouve",
        ]
        const results: any[] = []
        const allResponses = await Promise.all(
          knownNames.map(async (name) => {
            try {
              const res = await fetch(`/api/designers?search=${encodeURIComponent(name)}&limit=1`)
              if (res.ok) {
                const data = await res.json()
                if (data.success && data.designers.length > 0) return data.designers[0]
              }
            } catch {}
            return null
          })
        )
        for (const d of allResponses) {
          if (results.length >= 6) break
          if (d && d.image && !results.find((r: any) => r.id === d.id)) results.push(d)
        }
        // Compléter si < 6 résultats
        if (results.length < 6) {
          const fallback = await fetch("/api/designers?limit=20")
          if (fallback.ok) {
            const data = await fallback.json()
            if (data.success) {
              for (const d of data.designers) {
                if (results.length >= 6) break
                if (d.image && !results.find((r: any) => r.id === d.id)) results.push(d)
              }
            }
          }
        }
        setPreviewDesigners(results)
      } catch {}
    }

    loadLuminaires()
    loadDesigners()

    // Charger les images personnalisées de l'accueil
    fetch("/api/homepage-images")
      .then(r => r.json())
      .then(data => {
        if (data.success && data.images)   setHomepageImages(data.images)
        if (data.success && data.metadata) setHomepageMeta(data.metadata)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="bg-[#f5f1e8]">

      {/* ── Galerie flottante ── */}
      {/* rollback → remplacer FloatingGallery par : <CorridorGallery videoUrl="" /> */}
      <FloatingGallery apiUrl={apiUrl} />

      {/* ── Sections principales ── */}
      <div className="relative z-10 bg-[#f5f1e8]">

        <CategorySection
          luminaires={luminaires}
          homepageImages={homepageImages}
        />

        <DesignerCarousel designers={previewDesigners} />

        <ChronoSection luminaires={luminaires} />

        <PricingSection />

        <div className="py-10 text-center text-sm text-gray-400">
          <p className="font-serif">Luminaires - Du Moyen-Age a nos jours</p>
        </div>

      </div>

      {/* ── Modales ── */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <MobileFooter />

    </div>
  )
}
