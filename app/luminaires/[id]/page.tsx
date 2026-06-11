"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download, User, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import MobileFooter from "@/components/MobileFooter"

export default function LuminaireDetailPage() {
  const params = useParams()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [similarLuminaires, setSimilarLuminaires] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user, userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"
  const canSeeEstimation = user && (userData?.role === "admin" || userData?.role === "premium")

  useEffect(() => {
    if (!params.id) return

    async function fetchLuminaireData() {
      setIsLoading(true)
      try {
        console.log("🔍 Chargement luminaire ID:", params.id)

        const response = await fetch(`/api/luminaires/${params.id}`)
        if (!response.ok) throw new Error("Luminaire non trouvé")

        const result = await response.json()
        console.log("📊 Réponse API luminaire:", result)

        if (result.success) {
          const formattedLuminaire = {
            ...result.data,
            id: String(result.data._id || ""),
            _id: String(result.data._id || ""),

            artist: result.data.designer || result.data["Artiste / Dates"] || "",
            year: result.data.annee || result.data["Année"] || "",
            name: result.data.nom || result.data["Nom luminaire"] || "",
            description: result.data.description || result.data["Description"] || "",
            dimensions: result.data.dimensions || result.data["Dimensions"] || "",
            estimation: result.data.estimation || result.data["Estimation"] || "",
            editeur: result.data.editeur || result.data["Editeur"] || "",
            categorie: result.data.categorie || result.data["Catégorie"] || "",
            designerImageFilename: result.data.designerImageFilename || result.data["Image du designer"] || "",

            specialty: (() => {
              if (result.data.periode && String(result.data.periode).trim() !== "") {
                return result.data.periode
              }
              if (result.data["Spécialité"] && String(result.data["Spécialité"]).trim() !== "") {
                return result.data["Spécialité"]
              }
              return ""
            })(),

            collaboration: (() => {
              if (result.data.collaboration && String(result.data.collaboration).trim() !== "") {
                return result.data.collaboration
              }
              if (result.data["Collaboration / Œuvre"] && String(result.data["Collaboration / Œuvre"]).trim() !== "") {
                return result.data["Collaboration / Œuvre"]
              }
              return ""
            })(),

            materials: (() => {
              if (Array.isArray(result.data.materiaux) && result.data.materiaux.length > 0) {
                return result.data.materiaux.join(", ")
              }
              if (result.data.Matériaux && String(result.data.Matériaux).trim() !== "") {
                return result.data.Matériaux
              }
              return ""
            })(),

            signed: (() => {
              const signeKeys = ["signe", "signed", "Signé", "SIGNE", "SIGNED"]
              for (const key of signeKeys) {
                if (result.data[key] && typeof result.data[key] === "string" && result.data[key].trim() !== "") {
                  return result.data[key]
                }
              }
              return ""
            })(),

            lienSiteMarchand: result.data.lienSiteMarchand || result.data["Lien site marchand"] || "",
            etiquette: result.data.etiquette || result.data["Etiquette"] || "",
            bibliographie: result.data.bibliographie || result.data["Bibliographie"] || "",
          }

          console.log("✅ Luminaire formaté:", formattedLuminaire)

          setLuminaire(formattedLuminaire)

          const allLuminairesResponse = await fetch("/api/luminaires?limit=9999")
          const allLuminairesData = await allLuminairesResponse.json()

          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires)
            setSimilarLuminaires(similar)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement:", error)
        setLuminaire(null)
      } finally {
        setIsLoading(false)
      }

      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      setIsFavorite(favorites.includes(String(params.id)))
    }

    fetchLuminaireData()
  }, [params.id])

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.year) || 0

    const scored = all
      .filter((item) => String(item._id) !== String(current._id))
      .map((item) => {
        let score = 0

        const itemArtist = String(item["Artiste / Dates"] || item.designer || "")
        const itemSpecialty = String(item["Spécialité"] || item.periode || item.specialite || "")
        const itemYear = Number.parseInt(String(item.annee || item["Année"] || "")) || 0

        if (itemArtist && current.artist && itemArtist.toLowerCase() === current.artist.toLowerCase()) {
          score += 50
        }

        if (itemSpecialty && current.specialty && itemSpecialty.toLowerCase() === current.specialty.toLowerCase()) {
          score += 30
        }

        if (current.materials && item.materiaux) {
          const currentMaterials = current.materials
            .toLowerCase()
            .split(/[,\s]+/)
            .filter((m: string) => m.length > 2)
          const itemMaterials = Array.isArray(item.materiaux)
            ? item.materiaux
                .join(", ")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m: string) => m.length > 2)
            : String(item.materiaux || "")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m: string) => m.length > 2)

          const commonMaterials = currentMaterials.filter((mat: string) =>
            itemMaterials.some((itemMat: string) => itemMat.includes(mat) || mat.includes(itemMat)),
          )
          score += commonMaterials.length * 15
        }

        if (currentYear > 0 && itemYear > 0) {
          const yearDiff = Math.abs(currentYear - itemYear)
          if (yearDiff === 0) score += 25
          else if (yearDiff <= 1) score += 20
          else if (yearDiff <= 2) score += 15
          else if (yearDiff <= 5) score += 10
          else if (yearDiff <= 10) score += 5
          else if (yearDiff <= 20) score += 2
        }

        if (current.name && item["Nom luminaire"]) {
          const currentWords = current.name
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)
          const itemWords = String(item["Nom luminaire"])
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)
          const commonWords = currentWords.filter((word: string) =>
            itemWords.some((itemWord: string) => itemWord.includes(word) || word.includes(itemWord)),
          )
          score += commonWords.length * 8
        }

        if (current.editeur && item.editeur && current.editeur.toLowerCase() === item.editeur.toLowerCase()) {
          score += 12
        }

        return {
          ...item,
          id: String(item._id || ""),
          artist: itemArtist,
          year: String(item.annee || item["Année"] || ""),
          name: String(item["Nom luminaire"] || item.nom || "Sans nom"),
          similarityScore: score,
          image: (() => {
            if (item.imageId) {
              return `/api/images/${item.imageId}`
            }
            if (item.filename || item["Nom du fichier"] || item["Image luminaire (Nom du fichier)"]) {
              const filename = item.filename || item["Nom du fichier"] || item["Image luminaire (Nom du fichier)"]
              return `/api/images/filename/${filename}`
            }
            return null
          })(),
        }
      })

    const topSimilar = scored
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6)

    if (topSimilar.length < 6) {
      const remaining = scored
        .filter((item) => !topSimilar.includes(item) && item.similarityScore === 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6 - topSimilar.length)

      return [...topSimilar, ...remaining]
    }

    return topSimilar
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return

    const keyMapping: { [key: string]: string } = {
      artist: "designer",
      specialty: "periode",
      collaboration: "collaboration",
      description: "description",
      name: "nom",
      year: "annee",
      signed: "signe",
      dimensions: "dimensions",
      materials: "Matériaux",
      estimation: "estimation",
      editeur: "editeur",
      categorie: "categorie",
      lienSiteMarchand: "lienSiteMarchand",
      etiquette: "etiquette",
      bibliographie: "bibliographie",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: value }))

    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyToUpdate]: value }),
      })

      if (field === "artist") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Artiste / Dates": value }),
        })
      } else if (field === "specialty") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Spécialité: value }),
        })
      } else if (field === "collaboration") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Collaboration / Œuvre": value }),
        })
      } else if (field === "categorie") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Catégorie: value }),
        })
      } else if (field === "lienSiteMarchand") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Lien site marchand": value }),
        })
      } else if (field === "etiquette") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Etiquette: value }),
        })
      } else if (field === "bibliographie") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Bibliographie: value }),
        })
      }
    } catch (error) {
      console.error("❌ Erreur de mise à jour:", error)
    }
  }

  const toggleFavorite = () => {
    if (!luminaire) return

    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    const newFavorites = isFavorite
      ? favorites.filter((id: string) => String(id) !== String(luminaire._id))
      : [...favorites, String(luminaire._id)]

    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)
  }

  const generatePDF = async () => {
    if (!luminaire) return
    setGeneratingPDF(true)

    try {
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const marginX = 15

      // Fond blanc
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, "F")

      // ── 1. LOGO ──
      let logoLoaded = false
      try {
        const logoUrl = `${window.location.origin}/images/gersaint-logo.png`
        const logoResponse = await fetch(logoUrl)
        const logoBlob = await logoResponse.blob()
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
        const logoW = 50
        const logoH = 25
        pdf.addImage(logoBase64, "PNG", (pageWidth - logoW) / 2, 15, logoW, logoH)
        logoLoaded = true
      } catch {
        // fallback ci-dessous
      }
      if (!logoLoaded) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(24)
        pdf.setTextColor(60, 60, 60)
        pdf.text("GERSAINT", pageWidth / 2, 30, { align: "center" })
      }

      // ── 2. NOM + DESIGNER (sans année) ──
      pdf.setFont("times", "bold")
      pdf.setFontSize(18)
      pdf.setTextColor(40, 40, 40)
      pdf.text(luminaire.name || "Sans nom", marginX, 54)

      pdf.setFont("times", "italic")
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text(luminaire.artist || "", marginX, 62)

      // ── 3. IMAGE ──
      let yAfterImage = 70
      if (luminaire.filename) {
        try {
          const imageUrl = `/api/images/filename/${luminaire.filename}`
          const imgBlob = await (await fetch(imageUrl)).blob()
          const imgBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(imgBlob)
          })
          const imgW = 80
          const imgH = 80
          pdf.addImage(imgBase64, "JPEG", (pageWidth - imgW) / 2, 68, imgW, imgH)
          yAfterImage = 68 + imgH + 10
        } catch {
          // pas d'image
        }
      }

      // ── 4. DEUX COLONNES ──
      const colLeftX  = 15
      const colRightX = 110
      const colWidth  = 85
      let yLeft  = yAfterImage + 8
      let yRight = yAfterImage + 8

      const drawField = (x: number, y: number, label: string, value: string): number => {
        pdf.setFont("times", "bold")
        pdf.setFontSize(10)
        pdf.setTextColor(61, 43, 31)   // #3d2b1f
        pdf.text(label, x, y)
        const labelH = 4.5
        pdf.setFont("times", "normal")
        pdf.setTextColor(85, 85, 85)   // #555555
        const lines = pdf.splitTextToSize(value, colWidth)
        pdf.text(lines, x, y + labelH)
        return y + labelH + lines.length * 3.8 + 2
      }

      const addLeft = (label: string, value: string | undefined) => {
        if (!value || !value.trim()) return
        yLeft = drawField(colLeftX, yLeft, label, value)
      }

      const addRight = (label: string, value: string | undefined) => {
        if (!value || !value.trim()) return
        yRight = drawField(colRightX, yRight, label, value)
      }

      // Colonne gauche
      addLeft("Éditeur",    luminaire.editeur)
      addLeft("Année",      luminaire.year)
      addLeft("Signé",      luminaire.signed)
      if (canSeeEstimation) addLeft("Estimation", luminaire.estimation)

      // Colonne droite
      addRight("Catégorie", luminaire.categorie)
      addRight("Dimensions", luminaire.dimensions)
      addRight("Matériaux", luminaire.materials)
      addRight("Puissance", luminaire.puissance || luminaire.power)

      // ── 5. DESCRIPTION + BIBLIOGRAPHIE ──
      const yBelowCols = Math.max(yLeft, yRight) + 1

      let yText = yBelowCols + 8

      if (luminaire.description && luminaire.description.trim()) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(61, 43, 31)
        pdf.text("Description", marginX, yText)
        yText += 6
        pdf.setFont("times", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(85, 85, 85)
        const descLines = pdf.splitTextToSize(luminaire.description, pageWidth - marginX * 2)
        pdf.text(descLines, marginX, yText)
        yText += descLines.length * 3.8 + 6
      }

      if (luminaire.bibliographie && luminaire.bibliographie.trim()) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(61, 43, 31)
        pdf.text("Bibliographie", marginX, yText)
        yText += 6
        pdf.setFont("times", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(85, 85, 85)
        const biblioLines = pdf.splitTextToSize(luminaire.bibliographie, pageWidth - marginX * 2)
        pdf.text(biblioLines, marginX, yText)
      }

      // Footer
      pdf.setFontSize(9)
      pdf.setTextColor(60, 60, 60)
      pdf.setFont("times", "bold")
      pdf.text("GERSAINT PARIS", pageWidth / 2, pageHeight - 14, { align: "center" })
      pdf.setFont("times", "normal")
      pdf.text("42 rue de Maubeuge, 75009", pageWidth / 2, pageHeight - 10, { align: "center" })
      pdf.text("contact@gersaintparis.fr", pageWidth / 2, pageHeight - 6, { align: "center" })

      pdf.save(`${luminaire.name || "luminaire"}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleDeleteLuminaire = async (luminaireId: string) => {
    try {
      const response = await fetch(`/api/luminaires/${luminaireId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        window.location.href = "/luminaires"
      } else {
        alert(`Erreur lors de la suppression: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erreur lors de la suppression: ${error.message}`)
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="text-center py-16">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!luminaire) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Luminaire non trouvé.</p>
        <Link href="/luminaires">
          <Button className="mt-4">Retour</Button>
        </Link>
      </div>
    )
  }

  // ── Tokens visuels ────────────────────────────────────────────────────────
  const CREAM = "#f5f1e8"
  const TEXT  = "#3d2b1f"
  const MUTED = "#7a6654"
  const LINE  = "#d8d0c0"
  const BROWN = "#8b7355"
  const SERIF = '"Playfair Display", Georgia, serif'
  const SANS  = "Georgia, serif"

  const cleanArtistName = (name: string) =>
    name.replace(/\s*\([^)]*[-–][^)]*\)[\s\S]*$/, "").trim() || name

  const imageUrl = luminaire.image
    || (luminaire.filename ? `/api/images/filename/${luminaire.filename}` : null)

  const specFields = [
    { label: "Éditeur",    value: luminaire.editeur,    field: "editeur" },
    { label: "Année",      value: luminaire.year,       field: "year" },
    { label: "Matériaux",  value: luminaire.materials,  field: "materials" },
    { label: "Dimensions", value: luminaire.dimensions, field: "dimensions" },
    { label: "Catégorie",  value: luminaire.categorie,  field: "categorie" },
    { label: "Signé",      value: luminaire.signed,     field: "signed" },
  ]
  const visibleSpecs = specFields.filter(s => (s.value && String(s.value).trim()) || canEdit)

  return (
    <div style={{ background: CREAM, minHeight: "100vh" }}>

      {/* ── En-tête mobile ─────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ borderBottom: `1px solid ${LINE}`, padding: "14px 16px 14px 52px", display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
        <Link href="/luminaires" style={{ display: "flex", flexShrink: 0 }}>
          <ArrowLeft size={16} style={{ color: TEXT }} />
        </Link>
        <span style={{ fontFamily: SERIF, fontSize: "0.88rem", color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cleanArtistName(luminaire.artist)} — {luminaire.name}
        </span>
      </div>

      {/* ── Actions desktop ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between" style={{ padding: "28px 52px 0" }}>
        <Link
          href="/luminaires"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, textDecoration: "none" }}
        >
          <ArrowLeft size={11} /> Retour aux luminaires
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {canEdit && (
            <DeleteLuminaireButton
              luminaireId={String(luminaire._id)}
              luminaireName={String(luminaire.name || "Luminaire")}
              onDelete={() => handleDeleteLuminaire(String(luminaire._id))}
            />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Image + Informations
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col md:flex-row pl-6 md:pl-[52px] pr-4 md:pr-[52px]"
        style={{ paddingTop: 44, paddingBottom: 0 }}
      >

        {/* ── Image ── */}
        <div className="w-full md:w-[min(460px,48%)] flex-shrink-0 mb-8 md:mb-0">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1", background: CREAM }}>
            {imageUrl
              ? <Image
                  src={imageUrl}
                  alt={String(luminaire.name || "Luminaire")}
                  fill
                  unoptimized
                  style={{ objectFit: "contain" }}
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 40, opacity: 0.18 }}>🏮</span>
                </div>
            }
            {/* Bouton favori */}
            <button
              onClick={toggleFavorite}
              style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: CREAM, border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15 }}
            >
              <span style={{ color: isFavorite ? "#c0392b" : LINE }}>♥</span>
            </button>
          </div>
        </div>

        {/* ── Informations ── */}
        <div className="flex-1 md:pl-14">

          {/* Tag */}
          <p style={{ fontFamily: SANS, fontSize: "0.57rem", letterSpacing: "0.3em", textTransform: "uppercase", color: MUTED, marginBottom: 18, marginTop: 0 }}>
            Collection Gersaint Paris
          </p>

          {/* Nom */}
          <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)", color: TEXT, lineHeight: 1.08, marginBottom: 16 }}>
            <EditableField value={luminaire.name || ""} onSave={(v) => handleUpdate("name", v)} disabled={!canEdit} className="font-normal" />
          </div>

          {/* Année + filet */}
          {luminaire.year && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <span style={{ fontFamily: SERIF, fontSize: "1rem", color: MUTED, whiteSpace: "nowrap" }}>
                {luminaire.year}
              </span>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>
          )}

          {/* Lien designer */}
          <Link href={`/designers/${encodeURIComponent(luminaire.artist)}`} style={{ textDecoration: "none", display: "block", marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${LINE}`, paddingBottom: 20, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e0d6", overflow: "hidden", position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {luminaire.designerImageFilename
                  ? <Image src={`/api/images/filename/${luminaire.designerImageFilename}`} alt={cleanArtistName(luminaire.artist)} fill unoptimized style={{ objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none" }} />
                  : <User size={18} style={{ color: "#b8ad9e" }} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: SANS, fontSize: "0.54rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, margin: "0 0 3px" }}>Designer</p>
                <p style={{ fontFamily: SERIF, fontSize: "0.92rem", color: TEXT, margin: 0 }}>
                  {cleanArtistName(luminaire.artist)}
                </p>
              </div>
              <ArrowRight size={14} style={{ color: MUTED, flexShrink: 0 }} />
            </div>
          </Link>

          {/* ── Estimation + Fiche PDF ── */}
          {canSeeEstimation && (
            <div style={{ borderBottom: `1px solid ${LINE}`, paddingTop: 18, paddingBottom: 18, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <p style={{ fontFamily: SANS, fontSize: "0.64rem", letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, fontWeight: 700, margin: 0, flexShrink: 0 }}>
                  Estimation
                </p>
                <div style={{ fontFamily: SERIF, fontSize: "1.3rem", color: TEXT, fontWeight: 600 }}>
                  <EditableField value={luminaire.estimation || ""} onSave={(v) => handleUpdate("estimation", v)} disabled={!canEdit} className="font-semibold" placeholder="—" />
                </div>
              </div>
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: TEXT, background: "transparent", border: `1px solid ${LINE}`, padding: "9px 16px", cursor: "pointer", flexShrink: 0 }}
              >
                <Download size={12} /> {generatingPDF ? "Génération…" : "Fiche PDF"}
              </button>
            </div>
          )}

          {/* ── Information Technique ── */}
          {visibleSpecs.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: SANS, fontSize: "0.64rem", letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginBottom: 18, marginTop: 0 }}>
                Information Technique
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 36px" }}>
                {visibleSpecs.map(({ label, value, field }) => (
                  <div key={field}>
                    <p style={{ fontFamily: SANS, fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, margin: "0 0 5px", fontWeight: 600 }}>
                      {label}
                    </p>
                    <div style={{ fontFamily: SERIF, fontSize: "0.88rem", color: TEXT, fontWeight: 400 }}>
                      <EditableField value={String(value || "")} onSave={(v) => handleUpdate(field, v)} disabled={!canEdit} className="font-normal" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Lien marchand ── */}
          {(luminaire.lienSiteMarchand || canEdit) && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: SANS, fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>
                Lien marchand
              </p>
              <div style={{ fontFamily: SANS, fontSize: "0.82rem", color: BROWN }}>
                <EditableField value={luminaire.lienSiteMarchand || ""} onSave={(v) => handleUpdate("lienSiteMarchand", v)} disabled={!canEdit} className="font-normal" placeholder="—" />
              </div>
            </div>
          )}

          {/* ── Étiquette (admin) ── */}
          {canEdit && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: SANS, fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>
                Étiquette
              </p>
              <div style={{ fontFamily: SANS, fontSize: "0.82rem", color: TEXT }}>
                <EditableField value={luminaire.etiquette || ""} onSave={(v) => handleUpdate("etiquette", v)} disabled={!canEdit} className="font-normal" placeholder="—" />
              </div>
            </div>
          )}

          {/* ── Actions mobiles ── */}
          <div className="md:hidden" style={{ borderTop: `1px solid ${LINE}`, paddingTop: 20, marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {canEdit && (
              <DeleteLuminaireButton
                luminaireId={String(luminaire._id)}
                luminaireName={String(luminaire.name || "Luminaire")}
                onDelete={() => handleDeleteLuminaire(String(luminaire._id))}
              />
            )}
          </div>

        </div>
      </div>

      {/* ── Description + Bibliographie (en dessous de l'image) ── */}
      {((luminaire.description || canEdit) || (luminaire.bibliographie || canEdit)) && (
        <div className="pl-6 md:pl-[52px] pr-4 md:pr-[52px]" style={{ paddingTop: 0, paddingBottom: 64 }}>
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 36 }}>

            {(luminaire.description || canEdit) && (
              <div style={{ marginBottom: 36 }}>
                <p style={{ fontFamily: SANS, fontSize: "0.64rem", letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>
                  Description
                </p>
                <div style={{ fontFamily: SERIF, fontSize: "0.92rem", color: TEXT, lineHeight: 1.9, fontWeight: 400, maxWidth: "72ch" }}>
                  <EditableField value={luminaire.description || ""} onSave={(v) => handleUpdate("description", v)} multiline disabled={!canEdit} className="font-normal" placeholder={canEdit ? "Ajouter une description…" : "—"} />
                </div>
              </div>
            )}

            {(luminaire.bibliographie || canEdit) && (
              <div>
                <p style={{ fontFamily: SANS, fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginBottom: 10, marginTop: 0 }}>
                  Bibliographie
                </p>
                <div style={{ fontFamily: SANS, fontSize: "0.84rem", color: MUTED, lineHeight: 1.7, maxWidth: "72ch" }}>
                  <EditableField value={luminaire.bibliographie || ""} onSave={(v) => handleUpdate("bibliographie", v)} multiline disabled={!canEdit} className="font-normal" placeholder="—" />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ŒUVRES SIMILAIRES
      ══════════════════════════════════════════════════════════════════════ */}
      {similarLuminaires.length > 0 && (
        <div className="pl-6 md:pl-[52px] pr-4 md:pr-[52px]" style={{ paddingBottom: 80 }}>
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 36, marginBottom: 36 }}>
            <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(1.4rem, 3vw, 2rem)", color: TEXT, margin: "0 0 6px" }}>
              Œuvres similaires
            </h2>
            <p style={{ fontFamily: SANS, fontSize: "0.73rem", color: MUTED, margin: 0 }}>
              Du même atelier ou de la même période
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: "clamp(10px, 2vw, 14px)" }}>
            {similarLuminaires.slice(0, 5).map((similar) => {
              const simUrl = similar.image || (similar.filename ? `/api/images/filename/${similar.filename}` : null)
              return (
                <Link
                  key={similar._id}
                  href={`/luminaires/${similar._id}`}
                  className="group block"
                  style={{ textDecoration: "none" }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1", background: "#2a2018", marginBottom: 12 }}>
                    {simUrl
                      ? <Image src={simUrl} alt={similar.name} fill unoptimized style={{ objectFit: "cover", transition: "transform 0.5s ease" }} className="group-hover:scale-[1.04]" onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 24, opacity: 0.2 }}>🏮</span></div>
                    }
                  </div>
                  {similar.year && (
                    <p style={{ fontFamily: SANS, fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>
                      {/^\d{4}$/.test(String(similar.year)) ? `Circa ${similar.year}` : similar.year}
                    </p>
                  )}
                  <h3 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(0.74rem, 1vw, 0.86rem)", color: TEXT, margin: "0 0 3px", lineHeight: 1.25 }}>
                    {similar.name}
                  </h3>
                  {similar.artist && (
                    <p style={{ fontFamily: SANS, fontSize: "0.58rem", color: MUTED, margin: 0 }}>
                      {cleanArtistName(String(similar.artist))}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <MobileFooter />
    </div>
  )
}
