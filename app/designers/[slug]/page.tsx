"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import { toast } from "sonner"
import MobileFooter from "@/components/MobileFooter" // Import MobileFooter component

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<any>(null)
  const [designerLuminaires, setDesignerLuminaires] = useState<any[]>([])
  const [description, setDescription] = useState("")
  const [collaboration, setCollaboration] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { userData } = useAuth()
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    if (!params.slug) return

    const designerSlug = decodeURIComponent(params.slug as string)
    console.log("🔍 Designer slug:", designerSlug)

    async function fetchDesignerData() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/designers/${encodeURIComponent(designerSlug)}`)
        const result = await response.json()
        console.log("📊 Réponse API designer:", result)

        if (result.success) {
          setDesigner(result.data.designer)

          const designerImageFilename = result.data.luminaires.find(
            (lum: any) => lum.designerImageFilename,
          )?.designerImageFilename

          const adaptedLuminaires = result.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.filename ? `/api/images/filename/${lum.filename}` : null,
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum.annee || lum["Année"] || "",
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            specialty: lum["Spécialité"] || lum.periode || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
            editeur: lum.editeur || lum.Editeur || "",
          }))

          setDesignerLuminaires(adaptedLuminaires)
          console.log("✅ Luminaires adaptés:", adaptedLuminaires.length)

          if (designerImageFilename) {
            setDesigner((prev) => ({
              ...prev,
              imagedesigner: designerImageFilename,
            }))
            console.log("✅ Image designer trouvée:", designerImageFilename)
          }

          if (adaptedLuminaires.length > 0) {
            const fullDesignerField = adaptedLuminaires[0].artist
            const defaultSpecialty = adaptedLuminaires[0].specialty

            // Récupérer les collaborations ET les éditeurs
            const allCollaborations = adaptedLuminaires
              .map((lum) => lum["Collaboration / Œuvre"] || lum.collaboration || "")
              .filter((collab) => collab && collab.trim() !== "")
              .filter((value, index, self) => self.indexOf(value) === index)

            const allEditeurs = adaptedLuminaires
              .map((lum) => lum.editeur || lum.Editeur || "")
              .filter((editeur) => editeur && editeur.trim() !== "")
              .filter((value, index, self) => self.indexOf(value) === index)

            // Combiner collaborations et éditeurs sans doublons
            const combinedInfo = [...allCollaborations, ...allEditeurs]
              .filter((value, index, self) => self.indexOf(value) === index)
              .join(" • ")

            const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}")
            const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}")

            const finalDescription = storedDescriptions[fullDesignerField] || defaultSpecialty
            const finalCollaboration = storedCollaborations[fullDesignerField] || combinedInfo || ""

            setDescription(finalDescription)
            setCollaboration(finalCollaboration)
          }
        } else {
          console.error("❌ Erreur API:", result.error)
          setDesigner(null)
        }
      } catch (error) {
        console.error("❌ Erreur chargement données designer:", error)
        setDesigner(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDesignerData()
  }, [params.slug])

  const updateDescription = (newDescription: string) => {
    if (!canEdit) return
    setDescription(newDescription)
    if (designerLuminaires.length > 0) {
      const fullDesignerField = designerLuminaires[0].artist
      const storedDescriptions = JSON.parse(localStorage.getItem("designer-descriptions") || "{}")
      storedDescriptions[fullDesignerField] = newDescription
      localStorage.setItem("designer-descriptions", JSON.stringify(storedDescriptions))
    }
  }

  const updateCollaboration = (newCollaboration: string) => {
    if (!canEdit) return
    setCollaboration(newCollaboration)
    if (designerLuminaires.length > 0) {
      const fullDesignerField = designerLuminaires[0].artist
      const storedCollaborations = JSON.parse(localStorage.getItem("designer-collaborations") || "{}")
      storedCollaborations[fullDesignerField] = newCollaboration
      localStorage.setItem("designer-collaborations", JSON.stringify(storedCollaborations))
    }
  }

  const updateDesignerName = async (newName: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "Artiste / Dates": newName,
            designer: newName,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)

      setDesigner((prev) => ({ ...prev, nom: newName }))
      setDesignerLuminaires((prev) => prev.map((lum) => ({ ...lum, artist: newName })))

      console.log("✅ Nom du designer mis à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour nom designer:", error)
    }
  }

  const updateDesignerSpecialty = async (newSpecialty: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Spécialité: newSpecialty,
            periode: newSpecialty,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)
      updateDescription(newSpecialty)

      console.log("✅ Spécialité du designer mise à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour spécialité designer:", error)
    }
  }

  const updateDesignerCollaboration = async (newCollaboration: string) => {
    if (!canEdit) return

    try {
      const updatePromises = designerLuminaires.map(async (luminaire) => {
        const response = await fetch(`/api/luminaires/${luminaire.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "Collaboration / Œuvre": newCollaboration,
            collaboration: newCollaboration,
          }),
        })
        return response.json()
      })

      await Promise.all(updatePromises)
      updateCollaboration(newCollaboration)

      console.log("✅ Collaboration du designer mise à jour avec succès")
    } catch (error) {
      console.error("❌ Erreur mise à jour collaboration designer:", error)
    }
  }

  const updateLuminaire = (id: string, updates: any) => {
    if (!canEdit) return
    setDesignerLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
  }

  const handleCreateLuminaire = async (luminaireData: any) => {
    try {
      console.log("📝 Création du luminaire:", luminaireData)

      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(luminaireData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Luminaire créé avec succès!")
        // Recharger les luminaires du designer
        const designerSlug = decodeURIComponent(params.slug as string)
        const refreshResponse = await fetch(`/api/designers/${encodeURIComponent(designerSlug)}`)
        const refreshResult = await refreshResponse.json()

        if (refreshResult.success) {
          const adaptedLuminaires = refreshResult.data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum.filename ? `/api/images/filename/${lum.filename}` : null,
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum.annee || lum["Année"] || "",
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            specialty: lum["Spécialité"] || lum.periode || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
            editeur: lum.editeur || lum.Editeur || "",
          }))
          setDesignerLuminaires(adaptedLuminaires)
          setDesigner((prev) => ({ ...prev, count: adaptedLuminaires.length }))
        }

        return result
      } else {
        throw new Error(result.error || "Erreur lors de la création")
      }
    } catch (error: any) {
      console.error("❌ Erreur création luminaire:", error)
      toast.error(`Erreur: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 font-serif">Chargement...</div>
  }

  if (!designer) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="font-serif">Designer non trouvé.</p>
        <Link href="/designers">
          <Button className="mt-4">Retour</Button>
        </Link>
      </div>
    )
  }

  const defaultFormValues = {
    designer: designer.nom || "",
    periode: description || "",
    collaboration: collaboration || "",
    designerImageFilename: designer.imagedesigner || "",
  }

  // ── Tokens visuels ────────────────────────────────────────────────────────
  const CREAM = "#f5f1e8"
  const TEXT  = "#3d2b1f"
  const MUTED = "#7a6654"
  const LINE  = "#d8d0c0"
  const SERIF = '"Playfair Display", Georgia, serif'
  const SANS  = "Georgia, serif"

  // ── Nom nettoyé (sans dates entre parenthèses) ────────────────────────────
  const cleanedName = (designer.nom || "").replace(/\s*\(\s*[\d\?\s\-–]*[-–][\s\S]*$/, "").trim() || designer.nom
  const lastSp   = cleanedName.lastIndexOf(" ")
  const namePart1 = lastSp > 0 ? cleanedName.slice(0, lastSp) : cleanedName
  const namePart2 = lastSp > 0 ? cleanedName.slice(lastSp + 1) : ""

  // ── Dates : extraites du champ "Artiste / Dates" ou plage des années ──────
  const artistField = (designerLuminaires[0]?.artist as string) || ""
  const datesMatch  = artistField.match(/\((\d{4})\s*[-–]\s*(\d{4})?\s*\)/)
  let yearsStr = ""
  if (datesMatch) {
    const y1 = datesMatch[1]
    const y2 = datesMatch[2]?.trim()
    yearsStr = y2 ? `${y1} — ${y2}` : `${y1} —`
  } else {
    const lumYears = designerLuminaires.map(l => parseInt(l.year as string)).filter(y => !isNaN(y) && y > 1800)
    if (lumYears.length) {
      const mn = Math.min(...lumYears); const mx = Math.max(...lumYears)
      yearsStr = mn === mx ? `${mn}` : `${mn} — ${mx}`
    }
  }

  // ── Collaborations sous forme de liste ────────────────────────────────────
  const collabItems = collaboration
    ? collaboration.split(/\s*•\s*/).map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div style={{ background: CREAM, minHeight: "100vh" }}>

      {/* ── En-tête mobile ─────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ borderBottom: `1px solid ${LINE}`, padding: "14px 16px 14px 52px", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/designers" style={{ display: "flex", alignItems: "center" }}>
          <ArrowLeft size={16} style={{ color: TEXT }} />
        </Link>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.9rem", color: TEXT }}>
          {cleanedName}
        </span>
      </div>

      {/* ── Lien retour desktop ──────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ padding: "28px 52px 0" }}>
        <Link
          href="/designers"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, textDecoration: "none" }}
        >
          <ArrowLeft size={11} /> Retour aux designers
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Portrait + Identité
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col md:flex-row pl-6 md:pl-[52px] pr-4 md:pr-[52px]"
        style={{ paddingTop: 44, paddingBottom: 68 }}
      >
        {/* Portrait */}
        <div className="w-full md:w-[min(360px,38%)] flex-shrink-0 mb-8 md:mb-0">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4", background: CREAM }}>
            {designer.imagedesigner
              ? <Image
                  src={`/api/images/filename/${designer.imagedesigner}`}
                  alt={cleanedName}
                  fill
                  unoptimized
                  style={{ objectFit: "contain" }}
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8ad9e" }}>
                  <span style={{ fontSize: 52 }}>👤</span>
                </div>
            }
          </div>
        </div>

        {/* Identité */}
        <div className="flex-1 md:pl-16 md:pt-2">

          {/* Tag catégorie */}
          <p style={{ fontFamily: SANS, fontSize: "0.57rem", letterSpacing: "0.3em", textTransform: "uppercase", color: MUTED, marginBottom: 22, marginTop: 0 }}>
            Collection Gersaint Paris
          </p>

          {/* Nom — typographie display, 2 lignes */}
          <div style={{ marginBottom: 22 }}>
            <span style={{ display: "block", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2.4rem, 5.8vw, 4.8rem)", color: TEXT, lineHeight: 0.9 }}>
              {namePart1}
            </span>
            {namePart2 && (
              <span style={{ display: "block", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2.8rem, 6.6vw, 5.5rem)", color: TEXT, lineHeight: 0.92 }}>
                {namePart2}
              </span>
            )}
          </div>

          {/* Dates + filet horizontal */}
          {yearsStr && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 44 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.2rem, 2.5vw, 1.7rem)", color: MUTED, whiteSpace: "nowrap" }}>
                {yearsStr}
              </span>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>
          )}

          {/* Biographie + Collaborations */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 40, alignItems: "start" }}>

            {description && (
              <div>
                <p style={{ fontFamily: SANS, fontSize: "0.56rem", letterSpacing: "0.26em", textTransform: "uppercase", color: MUTED, marginBottom: 14, marginTop: 0, fontWeight: 700 }}>
                  Biographie
                </p>
                <div style={{ fontFamily: SANS, fontSize: "0.82rem", color: TEXT, lineHeight: 1.75, fontWeight: 400 }}>
                  <EditableField
                    value={description}
                    onSave={updateDesignerSpecialty}
                    multiline
                    disabled={!canEdit}
                    className="font-normal"
                  />
                </div>
              </div>
            )}

            {collabItems.length > 0 && (
              <div>
                <p style={{ fontFamily: SANS, fontSize: "0.56rem", letterSpacing: "0.26em", textTransform: "uppercase", color: MUTED, marginBottom: 0, marginTop: 0, fontWeight: 700 }}>
                  Collaborations
                </p>
                {collabItems.map((item, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${LINE}`, padding: "12px 0", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "0.88rem", color: TEXT, lineHeight: 1.3 }}>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ŒUVRES SÉLECTIONNÉES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="pl-6 md:pl-[52px] pr-4 md:pr-[52px]" style={{ paddingBottom: 80 }}>

        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 36, marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem, 3vw, 2rem)", color: TEXT, margin: "0 0 6px" }}>
              Œuvres Sélectionnées
            </h2>
            <p style={{ fontFamily: SANS, fontStyle: "italic", fontSize: "0.73rem", color: MUTED, margin: 0 }}>
              {designerLuminaires.length} luminaire{designerLuminaires.length !== 1 ? "s" : ""} dans la collection
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: TEXT, background: "transparent", border: `1px solid ${LINE}`, padding: "10px 18px", cursor: "pointer" }}
            >
              <Plus size={12} /> Nouveau luminaire
            </button>
          )}
        </div>

        {designerLuminaires.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: "clamp(10px, 2vw, 14px)" }}>
            {designerLuminaires.map((luminaire) => (
              <Link
                key={luminaire.id}
                href={`/luminaires/${luminaire.id}`}
                className="group block"
                style={{ textDecoration: "none" }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1", background: "#2a2018", marginBottom: 14 }}>
                  {luminaire.image
                    ? <Image
                        src={luminaire.image}
                        alt={luminaire.name}
                        fill
                        unoptimized
                        style={{ objectFit: "cover", transition: "transform 0.5s ease" }}
                        className="group-hover:scale-[1.04]"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                      />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 28, opacity: 0.25 }}>🏮</span>
                      </div>
                  }
                </div>
                {luminaire.year && (
                  <p style={{ fontFamily: SANS, fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, margin: "0 0 5px" }}>
                    {/^\d{4}$/.test(String(luminaire.year)) ? `Circa ${luminaire.year}` : luminaire.year}
                  </p>
                )}
                <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(0.78rem, 1.1vw, 0.92rem)", color: TEXT, margin: "0 0 4px", lineHeight: 1.25 }}>
                  {luminaire.name}
                </h3>
                {(luminaire.editeur || luminaire.collaboration) && (
                  <p style={{ fontFamily: SANS, fontStyle: "italic", fontSize: "0.63rem", color: MUTED, margin: 0, lineHeight: 1.4 }}>
                    {luminaire.editeur || luminaire.collaboration}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", color: MUTED }}>Aucun luminaire trouvé.</p>
          </div>
        )}
      </div>

      <LuminaireFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateLuminaire}
        defaultValues={defaultFormValues}
      />

      <MobileFooter />
    </div>
  )
}
