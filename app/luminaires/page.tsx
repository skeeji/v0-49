"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Home, Users, Grid3x3, Mail, User, Plus, LayoutGrid, List, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import MobileFooter from "@/components/MobileFooter"
import { useScrollRestoration, useMarkScrollRestoration } from "@/hooks/useScrollRestoration"

// ─── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const CAT_LABELS  = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]

const CREAM    = "#f5f1e8"
const BROWN    = "#8b7355"
const GOLD     = "#b8974a"
const TEXT     = "#3d2b1f"
const MUTED    = "#7a6654"
const LINE     = "#d8d0c0"

// ─── Composant filtre "ligne" ──────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder: string
}) {
  return (
    <div style={{ position: "relative" }}>
      <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.72rem", color: MUTED, margin: "0 0 0.3rem" }}>{label}</p>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", padding: "0.4rem 1.6rem 0.4rem 0", border: "none",
            borderBottom: `1px solid ${value ? BROWN : LINE}`,
            background: "transparent", fontFamily: "Georgia,serif", fontSize: "0.8rem",
            color: value ? TEXT : MUTED, outline: "none", appearance: "none",
            WebkitAppearance: "none", cursor: "pointer",
          }}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={12} style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }} />
      </div>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.72rem", color: MUTED, margin: "0 0 0.3rem" }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", padding: "0.4rem 0", border: "none",
          borderBottom: `1px solid ${value ? BROWN : LINE}`,
          background: "transparent", fontFamily: "Georgia,serif",
          fontStyle: "italic", fontSize: "0.8rem", color: TEXT,
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={e => (e.currentTarget.style.borderBottomColor = BROWN)}
        onBlur={e  => (e.currentTarget.style.borderBottomColor = value ? BROWN : LINE)}
      />
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  // ── Data ──────────────────────────────────────────────────────────────────
  const [luminaires,          setLuminaires]          = useState<any[]>([])
  const [allLuminaires,       setAllLuminaires]       = useState<any[]>([])
  const [allLuminairesLoaded, setAllLuminairesLoaded] = useState(false)
  const [loading,             setLoading]             = useState(true)
  const [loadingMore,         setLoadingMore]         = useState(false)
  const [homepageImages,      setHomepageImages]      = useState<Record<string,string>>({})

  // ── UI ────────────────────────────────────────────────────────────────────
  const [viewMode,    setViewMode]    = useState<"grid"|"list">("grid")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [searchTerm,         setSearchTerm]         = useState("")
  const [selectedCategorie,  setSelectedCategorie]  = useState("")
  const [selectedMateriau,   setSelectedMateriau]   = useState("")
  const [selectedCouleur,    setSelectedCouleur]    = useState("")
  const [selectedCreateur,   setSelectedCreateur]   = useState("")
  const [selectedEditeur,    setSelectedEditeur]    = useState("")
  const [selectedDimensions, setSelectedDimensions] = useState("")
  const [selectedEstimation, setSelectedEstimation] = useState("")
  const [selectedDesigner,   setSelectedDesigner]   = useState("")

  const [yearRange,      setYearRange]      = useState<number[]>([1900, 2024])
  const [yearMinInput,   setYearMinInput]   = useState("1900")
  const [yearMaxInput,   setYearMaxInput]   = useState("2024")
  const [sliderModified, setSliderModified] = useState(false)
  const [yearBounds,     setYearBounds]     = useState({ min: 1900, max: 2024 })

  const [sortField,     setSortField]     = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc"|"desc">("asc")

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage,   setCurrentPage]   = useState(1)
  const [totalItems,    setTotalItems]    = useState(0)
  const [totalDatabase, setTotalDatabase] = useState(9007)
  const [hasMore,       setHasMore]       = useState(true)
  const [displayOffset, setDisplayOffset] = useState(50)
  const [showFavorites, setShowFavorites] = useState(false)

  // ── Scroll restoration ────────────────────────────────────────────────────
  const [highlightedLuminaire, setHighlightedLuminaire] = useState<string|null>(null)
  const [pendingHighlightId,   setPendingHighlightId]   = useState<string|null>(null)
  const restorationDoneRef = useRef(false)

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user, userData } = useAuth()
  const isAdmin   = userData?.role === "admin"
  const isPremium = userData?.role === "admin" || (userData as any)?.isPremium
  const [favorites, setFavorites] = useState<string[]>([])

  // ─── Sync year inputs ──────────────────────────────────────────────────────
  useEffect(() => { setYearMinInput(String(yearRange[0])); setYearMaxInput(String(yearRange[1])) }, [yearRange])

  // ─── Images catégories ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/homepage-images").then(r => r.json())
      .then(d => { if (d.success && d.images) setHomepageImages(d.images) }).catch(() => {})
  }, [])

  // ─── URL params ───────────────────────────────────────────────────────────
  useEffect(() => {
    const designer  = searchParams.get("designer")
    const yearMin   = searchParams.get("yearMin")
    const yearMax   = searchParams.get("yearMax")
    const categorie = searchParams.get("categorie")
    if (designer)  setSelectedDesigner(designer)
    if (categorie) setSelectedCategorie(categorie)
    if (yearMin && yearMax) {
      const mn = parseInt(yearMin), mx = parseInt(yearMax)
      if (!isNaN(mn) && !isNaN(mx)) { setYearRange([mn, mx]); setSliderModified(true) }
    }
  }, [searchParams])

  // ─── Favoris ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) { setFavorites([]); return }
    fetch(`/api/users/favorites?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json()).then(d => { if (d.success) setFavorites(d.favorites || []) })
      .catch(e => console.error(e))
  }, [user?.email])

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user?.email) { toast.error("Vous devez être connecté pour gérer vos favoris"); return }
    const isFav = favorites.includes(id)
    setFavorites(prev => isFav ? prev.filter(x => x !== id) : [...prev, id])
    try {
      const r = await fetch("/api/users/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, luminaireId: id, action: isFav ? "remove" : "add" }),
      })
      const d = await r.json()
      if (!d.success) {
        setFavorites(prev => isFav ? [...prev, id] : prev.filter(x => x !== id))
        toast.error("Erreur lors de la mise à jour des favoris")
      }
    } catch {
      setFavorites(prev => isFav ? [...prev, id] : prev.filter(x => x !== id))
    }
  }, [user?.email, favorites])

  // ─── Chargement global (pour filtres client-side) ─────────────────────────
  const loadAllLuminaires = useCallback(async () => {
    try {
      const r = await fetch("/api/luminaires?limit=10000&page=1")
      const d = await r.json()
      if (d.success) { setAllLuminaires(d.luminaires); setAllLuminairesLoaded(true) }
    } catch (e) { console.error(e) }
  }, [])

  // ─── Chargement paginé (vue sans filtres) ─────────────────────────────────
  const fetchLuminaires = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true); else setLoadingMore(true)
      const params = new URLSearchParams({
        page: page.toString(), limit: "50",
        sortField, sortDirection,
      })
      const r = await fetch(`/api/luminaires?${params}`)
      const d = await r.json()
      if (d.success) {
        if (append && page > 1) {
          setLuminaires(prev => {
            const ids = new Set(prev.map((l: any) => l._id))
            const fresh = d.luminaires.filter((l: any) => !ids.has(l._id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        } else {
          setLuminaires(d.luminaires)
        }
        setHasMore(d.pagination?.hasMore || false)
        setTotalItems(d.pagination?.total || 0)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [sortField, sortDirection])

  useEffect(() => { loadAllLuminaires() }, [loadAllLuminaires])
  useEffect(() => { setCurrentPage(1); fetchLuminaires(1, false) }, [sortField, sortDirection]) // eslint-disable-line

  // ─── Infinite scroll ──────────────────────────────────────────────────────
  const hasFilters = !!(searchTerm || selectedCategorie || selectedMateriau || selectedCouleur ||
    selectedCreateur || selectedEditeur || selectedDimensions || selectedEstimation ||
    selectedDesigner || sliderModified)

  const loadMore = useCallback(() => {
    if (hasFilters) { setDisplayOffset(prev => prev + 50) }
    else if (!loadingMore && hasMore && !loading && !showFavorites) {
      const next = currentPage + 1; setCurrentPage(next); fetchLuminaires(next, true)
    }
  }, [hasFilters, loadingMore, hasMore, loading, currentPage, fetchLuminaires, showFavorites])

  const loadMoreRef = useRef(loadMore)
  useEffect(() => { loadMoreRef.current = loadMore }, [loadMore])

  useEffect(() => {
    if (showFavorites) return
    let t: NodeJS.Timeout
    const onScroll = () => {
      clearTimeout(t); t = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement
        if (scrollTop + clientHeight >= scrollHeight - 1000) loadMoreRef.current()
      }, 200)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t) }
  }, [showFavorites])

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleItemUpdate = useCallback(async (id: string, updates: any) => {
    try {
      const r = await fetch(`/api/luminaires/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
      const d = await r.json()
      if (d.success) { setLuminaires(prev => prev.map(item => item._id === id ? { ...item, ...updates } : item)); toast.success("Luminaire mis à jour") }
      else throw new Error(d.error)
    } catch { toast.error("Erreur lors de la mise à jour") }
  }, [])

  const handleCreateLuminaire = useCallback(async (data: any) => {
    try {
      const r = await fetch("/api/luminaires", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const d = await r.json()
      if (d.success) { toast.success("Luminaire créé"); setIsModalOpen(false); fetchLuminaires(1, false); loadAllLuminaires() }
      else throw new Error(d.error)
      return d
    } catch (e: any) { toast.error("Erreur lors de la création"); return { success: false } }
  }, [fetchLuminaires, loadAllLuminaires])

  // ─── Options de filtres (extraites de allLuminaires) ──────────────────────
  const filterOptions = useMemo(() => {
    if (!allLuminairesLoaded) return { categories: [], materiaux: [], couleurs: [], editeurs: [], createurs: [], estimations: [] }

    const cats = Array.from(new Set(allLuminaires.map(l => l.categorie || l["Catégorie"]).filter(Boolean))).sort() as string[]

    const matSet = new Set<string>()
    const colSet = new Set<string>()
    const edtSet = new Set<string>()
    const crtSet = new Set<string>()
    const estSet = new Set<string>()

    allLuminaires.forEach(l => {
      // Matériaux
      const mat = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(", ") : l.materiaux) || ""
      if (typeof mat === "string" && mat.trim()) mat.split(",").forEach((m: string) => { const s = m.trim(); if (s) matSet.add(s) })

      // Couleurs
      const col = l.couleurs || l["Couleur"] || l["Couleurs"] || []
      if (Array.isArray(col)) col.forEach((c: string) => { if (c?.trim()) colSet.add(c.trim()) })
      else if (typeof col === "string" && col.trim()) col.split(",").forEach((c: string) => { const s = c.trim(); if (s) colSet.add(s) })

      // Éditeur
      const edt = l.editeur || l["Editeur"] || l["Éditeur"] || ""
      if (typeof edt === "string" && edt.trim()) edtSet.add(edt.trim())

      // Créateur
      const crt = l["Artiste / Dates"] || l.designer || l.artiste || ""
      if (typeof crt === "string" && crt.trim()) {
        const name = crt.split(",")[0].trim()
        if (name) crtSet.add(name)
      }

      // Estimation
      const est = l.estimation || l["Estimation"] || ""
      if (typeof est === "string" && est.trim()) estSet.add(est.trim())
    })

    return {
      categories:  cats,
      materiaux:   (Array.from(matSet) as string[]).sort(),
      couleurs:    (Array.from(colSet) as string[]).sort(),
      editeurs:    (Array.from(edtSet) as string[]).sort(),
      createurs:   (Array.from(crtSet) as string[]).sort(),
      estimations: (Array.from(estSet) as string[]).sort(),
    }
  }, [allLuminaires, allLuminairesLoaded])

  // ─── Year bounds ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires/stats").then(r => r.json()).then(res => {
      if (res.success && res.data.yearRange) {
        const { min, max } = res.data.yearRange
        setYearBounds({ min, max })
        if (!searchParams.get("yearMin") && !searchParams.get("yearMax")) setYearRange([min, max])
      }
      if (res.data?.totalCount) setTotalDatabase(res.data.totalCount)
    }).catch(() => {})
  }, [searchParams])

  // ─── Handlers slider ──────────────────────────────────────────────────────
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value); if (v <= yearRange[1]) setYearRange([v, yearRange[1]])
  }
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value); if (v >= yearRange[0]) setYearRange([yearRange[0], v])
  }
  const handleSliderRelease = () => { setSliderModified(true); setDisplayOffset(50) }
  const handleMinBlur = () => {
    const v = parseInt(yearMinInput)
    if (!isNaN(v) && v >= yearBounds.min && v <= yearRange[1]) { setYearRange([v, yearRange[1]]); setSliderModified(true); setDisplayOffset(50) }
    else setYearMinInput(String(yearRange[0]))
  }
  const handleMaxBlur = () => {
    const v = parseInt(yearMaxInput)
    if (!isNaN(v) && v <= yearBounds.max && v >= yearRange[0]) { setYearRange([yearRange[0], v]); setSliderModified(true); setDisplayOffset(50) }
    else setYearMaxInput(String(yearRange[1]))
  }

  // ─── Filtrage client-side ─────────────────────────────────────────────────
  const filteredLuminaires = useMemo(() => {
    if (!allLuminairesLoaded || allLuminaires.length === 0) return []

    let f = allLuminaires

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      f = f.filter(l =>
        (l["Nom luminaire"] || l.nom || "").toLowerCase().includes(q) ||
        (l["Artiste / Dates"] || l.designer || "").toLowerCase().includes(q)
      )
    }
    if (selectedCategorie) {
      f = f.filter(l => (l.categorie || l["Catégorie"] || "") === selectedCategorie)
    }
    if (selectedMateriau) {
      const q = selectedMateriau.toLowerCase()
      f = f.filter(l => {
        const m = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(",") : l.materiaux) || ""
        return String(m).toLowerCase().includes(q)
      })
    }
    if (selectedCouleur) {
      const q = selectedCouleur.toLowerCase()
      f = f.filter(l => {
        const c = l.couleurs || l["Couleur"] || l["Couleurs"] || []
        const s = Array.isArray(c) ? c.join(",") : String(c)
        return s.toLowerCase().includes(q)
      })
    }
    if (selectedCreateur) {
      const q = selectedCreateur.toLowerCase()
      f = f.filter(l => (l["Artiste / Dates"] || l.designer || "").toLowerCase().includes(q))
    }
    if (selectedEditeur) {
      const q = selectedEditeur.toLowerCase()
      f = f.filter(l => (l.editeur || l["Editeur"] || l["Éditeur"] || "").toLowerCase().includes(q))
    }
    if (selectedDimensions) {
      const q = selectedDimensions.toLowerCase()
      f = f.filter(l => (l.dimensions || l["Dimensions"] || "").toLowerCase().includes(q))
    }
    if (selectedEstimation) {
      const q = selectedEstimation.toLowerCase()
      f = f.filter(l => (l.estimation || l["Estimation"] || "").toLowerCase().includes(q))
    }
    if (selectedDesigner) {
      f = f.filter(l => (l["Artiste / Dates"] || l.designer || "").includes(selectedDesigner))
    }
    if (sliderModified) {
      f = f.filter(l => {
        const a = l["Année"] || l.annee || l.year
        if (!a) return false
        const m = String(a).match(/\b(1[0-9]{3}|20[0-9]{2})\b/)
        if (!m) return false
        const y = parseInt(m[0])
        return !isNaN(y) && y >= yearRange[0] && y <= yearRange[1]
      })
    }

    // Tri client-side
    return [...f].sort((a, b) => {
      if (sortField === "annee") {
        const yr = (l: any) => { const v = l["Année"] || l.annee || l.year || ""; const m = String(v).match(/\b(1[0-9]{3}|20[0-9]{2})\b/); return m ? parseInt(m[0]) : 0 }
        return sortDirection === "asc" ? yr(a) - yr(b) : yr(b) - yr(a)
      }
      const na = (a["Nom luminaire"] || a.nom || "").toLowerCase()
      const nb = (b["Nom luminaire"] || b.nom || "").toLowerCase()
      return sortDirection === "asc" ? na.localeCompare(nb) : nb.localeCompare(na)
    })
  }, [allLuminaires, allLuminairesLoaded, searchTerm, selectedCategorie, selectedMateriau,
      selectedCouleur, selectedCreateur, selectedEditeur, selectedDimensions, selectedEstimation,
      selectedDesigner, sliderModified, yearRange, sortField, sortDirection])

  const freeUserLimit = isPremium ? Infinity : Math.floor(totalDatabase * 0.1)

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) return allLuminaires.filter(item => favorites.includes(String(item._id || "")))
    if (hasFilters) return filteredLuminaires.slice(0, displayOffset)
    return luminaires
  }, [filteredLuminaires, luminaires, showFavorites, favorites, allLuminaires, hasFilters, displayOffset])

  useEffect(() => { setDisplayOffset(50) }, [searchTerm, selectedCategorie, selectedMateriau,
    selectedCouleur, selectedCreateur, selectedEditeur, selectedDimensions, selectedEstimation,
    selectedDesigner, sliderModified, yearRange])

  const activeCount = hasFilters ? filteredLuminaires.length : totalItems

  const resetAllFilters = () => {
    setSearchTerm(""); setSelectedCategorie(""); setSelectedMateriau(""); setSelectedCouleur("")
    setSelectedCreateur(""); setSelectedEditeur(""); setSelectedDimensions(""); setSelectedEstimation("")
    setSelectedDesigner(""); setYearRange([yearBounds.min, yearBounds.max]); setSliderModified(false)
    setCurrentPage(1)
  }

  // ─── Scroll restoration ───────────────────────────────────────────────────
  const displayedCount = useMemo(() => {
    const f = luminaires.filter(l => {
      if (!allLuminairesLoaded) return true
      const md = !selectedDesigner || l["Artiste / Dates"]?.includes(selectedDesigner) || l.designer?.includes(selectedDesigner)
      const ly = l["Date / période"] ? parseInt(l["Date / période"]) : null
      return md && (!ly || (ly >= yearRange[0] && ly <= yearRange[1]))
    })
    return Math.min(f.length, displayOffset)
  }, [luminaires, selectedDesigner, yearRange, allLuminairesLoaded, displayOffset])

  const { saveScrollPosition } = useScrollRestoration("luminaires-page", displayedCount)
  const { saveForRestoration } = useMarkScrollRestoration()

  useEffect(() => {
    const from = sessionStorage.getItem("restore_from_luminaires")
    if (from !== "true") return
    const id = sessionStorage.getItem("restore_item_luminaires")
    sessionStorage.removeItem("restore_from_luminaires"); sessionStorage.removeItem("restore_item_luminaires")
    if (id) setPendingHighlightId(id)
  }, [])

  useEffect(() => {
    if (!pendingHighlightId || displayedLuminaires.length === 0 || restorationDoneRef.current) return
    const el = document.querySelector(`[data-item-id="${pendingHighlightId}"]`)
    if (el) {
      restorationDoneRef.current = true
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setHighlightedLuminaire(pendingHighlightId); setPendingHighlightId(null)
        setTimeout(() => setHighlightedLuminaire(null), 1500)
      }, window.innerWidth < 768 ? 400 : 100)
    }
  }, [displayedLuminaires, pendingHighlightId])

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading && luminaires.length === 0) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: BROWN }} />
        <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", color: MUTED }}>Chargement de la collection…</p>
      </div>
    </div>
  )

  if ((searchParams.get("designer") || searchParams.get("yearMin")) && !allLuminairesLoaded) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: BROWN }} />
        <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", color: MUTED }}>Chargement des filtres…</p>
      </div>
    </div>
  )

  const rangeWidth = yearBounds.max - yearBounds.min || 1

  // ─── Sidebar body ─────────────────────────────────────────────────────────
  const SidebarInner = (
    <div style={{ padding: "1.5rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.6rem" }}>

      {/* Recherche */}
      <div>
        <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.72rem", color: MUTED, margin: "0 0 0.3rem" }}>Recherche</p>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Nom, designer, époque…"
          style={{ width: "100%", padding: "0.4rem 0", border: "none", borderBottom: `1px solid ${searchTerm ? BROWN : LINE}`, background: "transparent", fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.8rem", color: TEXT, outline: "none", boxSizing: "border-box" }}
          onFocus={e => (e.currentTarget.style.borderBottomColor = BROWN)}
          onBlur={e  => (e.currentTarget.style.borderBottomColor = searchTerm ? BROWN : LINE)}
        />
      </div>

      <div style={{ borderTop: `1px solid ${LINE}` }} />

      {/* Période */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.8rem" }}>
          <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.72rem", color: MUTED, margin: 0 }}>Période</p>
          {sliderModified && (
            <button onClick={() => { setYearRange([yearBounds.min, yearBounds.max]); setSliderModified(false) }}
              style={{ fontFamily: "Georgia,serif", fontSize: "0.68rem", color: BROWN, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              effacer
            </button>
          )}
        </div>
        {/* Slider */}
        <div style={{ position: "relative", height: 32, marginBottom: "0.8rem" }}>
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: 2, background: LINE, borderRadius: 1 }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: 2, background: BROWN, borderRadius: 1, pointerEvents: "none", left: `${((yearRange[0]-yearBounds.min)/rangeWidth)*100}%`, right: `${100-((yearRange[1]-yearBounds.min)/rangeWidth)*100}%` }} />
          <input type="range" min={yearBounds.min} max={yearBounds.max} value={yearRange[0]}
            onChange={handleMinChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            className="lum-slider" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: 2, margin: 0, background: "transparent", appearance: "none", WebkitAppearance: "none", pointerEvents: "none", zIndex: 2 }} />
          <input type="range" min={yearBounds.min} max={yearBounds.max} value={yearRange[1]}
            onChange={handleMaxChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            className="lum-slider" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: 2, margin: 0, background: "transparent", appearance: "none", WebkitAppearance: "none", pointerEvents: "none", zIndex: 4 }} />
        </div>
        {/* Saisie manuelle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input type="text" value={yearMinInput}
            onChange={e => setYearMinInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderBottomColor = LINE; handleMinBlur() }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            onFocus={e => (e.currentTarget.style.borderBottomColor = BROWN)}
            style={{ flex: 1, padding: "0.3rem 0", border: "none", borderBottom: `1px solid ${LINE}`, background: "transparent", fontFamily: "Georgia,serif", fontSize: "0.78rem", color: TEXT, outline: "none", textAlign: "center" }}
          />
          <span style={{ fontFamily: "Georgia,serif", color: MUTED, fontSize: "0.8rem" }}>—</span>
          <input type="text" value={yearMaxInput}
            onChange={e => setYearMaxInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderBottomColor = LINE; handleMaxBlur() }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            onFocus={e => (e.currentTarget.style.borderBottomColor = BROWN)}
            style={{ flex: 1, padding: "0.3rem 0", border: "none", borderBottom: `1px solid ${LINE}`, background: "transparent", fontFamily: "Georgia,serif", fontSize: "0.78rem", color: TEXT, outline: "none", textAlign: "center" }}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}` }} />

      {/* Créateur */}
      <FilterInput label="Créateur" value={selectedCreateur} onChange={v => { setSelectedCreateur(v); setDisplayOffset(50) }} placeholder="Nom du créateur…" />

      {/* Catégorie */}
      <FilterSelect label="Catégorie" value={selectedCategorie} onChange={v => { setSelectedCategorie(v); setCurrentPage(1); setDisplayOffset(50) }} options={filterOptions.categories} placeholder="Toutes" />

      {/* Matériaux */}
      <FilterSelect label="Matériaux" value={selectedMateriau} onChange={v => { setSelectedMateriau(v); setCurrentPage(1); setDisplayOffset(50) }} options={filterOptions.materiaux} placeholder="Tous" />

      {/* Couleur */}
      {filterOptions.couleurs.length > 0 && (
        <FilterSelect label="Couleur" value={selectedCouleur} onChange={v => { setSelectedCouleur(v); setDisplayOffset(50) }} options={filterOptions.couleurs} placeholder="Toutes" />
      )}

      {/* Dimensions */}
      <FilterInput label="Dimensions" value={selectedDimensions} onChange={v => { setSelectedDimensions(v); setDisplayOffset(50) }} placeholder="ex. 60cm, 1m20…" />

      {/* Estimation */}
      {filterOptions.estimations.length > 0 ? (
        <FilterSelect label="Estimation" value={selectedEstimation} onChange={v => { setSelectedEstimation(v); setDisplayOffset(50) }} options={filterOptions.estimations} placeholder="Toutes" />
      ) : (
        <FilterInput label="Estimation" value={selectedEstimation} onChange={v => { setSelectedEstimation(v); setDisplayOffset(50) }} placeholder="ex. 500€, 1000-2000…" />
      )}

      {/* Éditeur */}
      {filterOptions.editeurs.length > 0 && (
        <FilterSelect label="Éditeur" value={selectedEditeur} onChange={v => { setSelectedEditeur(v); setDisplayOffset(50) }} options={filterOptions.editeurs} placeholder="Tous" />
      )}

      <div style={{ borderTop: `1px solid ${LINE}` }} />

      {/* Tri */}
      <div>
        <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.72rem", color: MUTED, margin: "0 0 0.3rem" }}>Trier par</p>
        <div style={{ position: "relative" }}>
          <select value={`${sortField}-${sortDirection}`}
            onChange={e => { const [f, d] = e.target.value.split("-"); setSortField(f); setSortDirection(d as "asc"|"desc") }}
            style={{ width: "100%", padding: "0.4rem 1.6rem 0.4rem 0", border: "none", borderBottom: `1px solid ${LINE}`, background: "transparent", fontFamily: "Georgia,serif", fontSize: "0.8rem", color: TEXT, outline: "none", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
            <option value="nom-asc">Nom A–Z</option>
            <option value="nom-desc">Nom Z–A</option>
            <option value="annee-asc">Année croissante</option>
            <option value="annee-desc">Année décroissante</option>
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }} />
        </div>
      </div>

      {/* Effacer tout */}
      {hasFilters && (
        <button onClick={resetAllFilters}
          style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.75rem", color: BROWN, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, textAlign: "left" }}>
          Effacer tous les filtres
        </button>
      )}
    </div>
  )

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20" style={{ background: CREAM }}>

      {/* CSS global */}
      <style jsx global>{`
        .lum-slider { pointer-events: none !important; }
        .lum-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: ${BROWN}; cursor: pointer; pointer-events: auto !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .lum-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: ${BROWN}; cursor: pointer; pointer-events: auto !important;
          border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .lum-card { transition: box-shadow 0.2s, transform 0.18s; }
        .lum-card:hover { box-shadow: 0 5px 22px rgba(139,115,85,0.16); transform: translateY(-2px); }
        .lum-row { transition: box-shadow 0.2s; }
        .lum-row:hover { box-shadow: 0 3px 14px rgba(139,115,85,0.13); }
        .lum-fav { opacity: 0; transition: opacity 0.18s; }
        .lum-card:hover .lum-fav, .lum-row:hover .lum-fav, .lum-fav.is-fav { opacity: 1 !important; }
        .lum-cat-item { transition: opacity 0.18s; }
        .lum-cat-item:hover { opacity: 0.82; }
      `}</style>

      {/* ══ BANDE CATÉGORIES (pleine largeur) ══════════════════════════════════ */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${LINE}`, padding: "1.75rem 2rem 1.5rem" }}>
        {/* Titre page */}
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.5rem" }}>
            <h1 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 500, color: TEXT, margin: 0, fontStyle: "italic" }}>
              Collection
            </h1>
            <span style={{ fontFamily: "Georgia,serif", fontSize: "0.82rem", color: MUTED, fontStyle: "italic" }}>
              {activeCount.toLocaleString()} luminaires
            </span>
          </div>

          {/* 6 catégories */}
          <div style={{ display: "flex", gap: "clamp(1rem,3vw,2.5rem)", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {CATEGORIES.map((cat, i) => {
              const src      = homepageImages[`homepage_luminaire_${i}`] || null
              const isActive = selectedCategorie === cat
              return (
                <button key={cat} className="lum-cat-item"
                  onClick={() => { setSelectedCategorie(isActive ? "" : cat); setDisplayOffset(50) }}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center", outline: "none" }}>
                  {/* Image */}
                  <div style={{
                    width: "clamp(70px,7vw,100px)", aspectRatio: "1/1", overflow: "hidden",
                    background: "#e8e0d0", marginBottom: "0.5rem",
                    outline: isActive ? `2px solid ${BROWN}` : "2px solid transparent",
                    outlineOffset: "2px", transition: "outline 0.18s",
                  }}>
                    {src
                      ? <img src={src} alt={CAT_LABELS[i]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>🏮</div>
                    }
                  </div>
                  {/* Label */}
                  <p style={{
                    fontFamily: "Georgia,serif", fontSize: "0.65rem", letterSpacing: "0.1em",
                    textTransform: "uppercase", color: isActive ? BROWN : MUTED,
                    margin: 0, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap",
                  }}>
                    {CAT_LABELS[i]}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══ LAYOUT 2 COLONNES ═══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:block" style={{
          width: "240px", flexShrink: 0, position: "sticky", top: 0,
          height: "100vh", overflowY: "auto",
          borderRight: `1px solid ${LINE}`,
        }}>
          {SidebarInner}
        </aside>

        {/* ── Sidebar mobile overlay ── */}
        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "min(300px,88vw)", background: CREAM, overflowY: "auto", borderRight: `1px solid ${LINE}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", borderBottom: `1px solid ${LINE}` }}>
                <span style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "1rem", color: TEXT }}>Filtres</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: "0.2rem" }}>
                  <X size={18} />
                </button>
              </div>
              {SidebarInner}
            </div>
          </div>
        )}

        {/* ── Contenu principal ── */}
        <main style={{ flex: 1, minWidth: 0, padding: "1.25rem 1.5rem 2rem" }}>

          {/* Barre top */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              {/* Bouton filtres mobile */}
              <button className="md:hidden" onClick={() => setSidebarOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.38rem 0.85rem", borderRadius: "50px", border: `1px solid ${LINE}`, background: "rgba(255,255,255,0.6)", fontSize: "0.76rem", color: TEXT, cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                <SlidersHorizontal size={13} /> Filtres
              </button>
              {/* Filtres actifs badge */}
              {hasFilters && (
                <button onClick={resetAllFilters}
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "50px", background: BROWN, border: "none", fontSize: "0.7rem", color: "#fff", cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                  <X size={10} /> Effacer les filtres
                </button>
              )}
            </div>

            {/* Toggle vue */}
            <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: "5px", overflow: "hidden" }}>
              {(["grid","list"] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  title={m === "grid" ? "Grille" : "Liste"}
                  style={{ padding: "0.38rem 0.6rem", border: "none", cursor: "pointer", background: viewMode === m ? BROWN : "transparent", color: viewMode === m ? "#fff" : MUTED, transition: "all 0.18s", display: "flex", alignItems: "center" }}>
                  {m === "grid" ? <LayoutGrid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>
          </div>

          {/* Banner premium */}
          {(!user || (userData?.role !== "premium" && userData?.role !== "admin")) && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", border: `1px solid ${LINE}`, borderRadius: "4px", background: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.82rem", color: TEXT, margin: "0 0 0.12rem" }}>
                  Accès limité — vous voyez 10% de la collection
                </p>
                <p style={{ fontFamily: "Georgia,serif", fontSize: "0.73rem", color: MUTED, margin: 0, fontStyle: "italic" }}>
                  Passez à Premium pour accéder à l'intégralité
                </p>
              </div>
              <Link href="/pricing">
                <button style={{ padding: "0.36rem 1rem", borderRadius: "50px", border: `1px solid ${BROWN}`, background: "transparent", color: BROWN, fontSize: "0.76rem", cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic", whiteSpace: "nowrap" }}>
                  Découvrir Premium →
                </button>
              </Link>
            </div>
          )}

          {/* ── Grille ── */}
          {viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(145px,1fr))", gap: "0.75rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok   = idx < freeUserLimit
                const isFav= favorites.includes(String(lum._id))
                const hi   = highlightedLuminaire === String(lum._id)
                const W    = ok ? Link : ("div" as any)
                return (
                  <W key={lum._id} data-item-id={String(lum._id)}
                    {...(ok ? { href: `/luminaires/${lum._id}` } : {})} style={{ textDecoration: "none" }}
                    onClick={() => { if (ok) { sessionStorage.setItem("restore_item_luminaires", String(lum._id)); sessionStorage.setItem("restore_from_luminaires", "true"); saveScrollPosition(); saveForRestoration() } }}>
                    <div className={`lum-card${!ok ? " grayscale opacity-50 cursor-not-allowed" : " cursor-pointer"}`}
                      style={{ background: "#fff", borderRadius: "3px", overflow: "hidden", border: `1px solid ${hi ? BROWN : LINE}`, outline: hi ? `2px solid ${BROWN}` : "none", position: "relative" }}>
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{ position: "absolute", top: 5, right: 5, zIndex: 5, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.72rem", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
                          aria-label={isFav ? "Retirer" : "Ajouter aux favoris"}>
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      )}
                      <div style={{ aspectRatio: "1/1", background: CREAM, position: "relative", overflow: "hidden" }}>
                        {lum.filename
                          ? <Image src={`/api/images/filename/${lum.filename}`} alt={lum["Nom luminaire"] || ""} fill className="object-cover" sizes="(max-width:640px) 50vw,(max-width:1024px) 25vw,18vw" loading="lazy" unoptimized />
                          : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem" }}>🏮</div>
                        }
                        {!ok && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(245,241,232,0.5)",fontSize:"1.3rem" }}>🔒</div>}
                      </div>
                      <div style={{ padding: "0.5rem 0.55rem 0.6rem" }}>
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.77rem", fontWeight: 600, color: TEXT, margin: "0 0 0.15rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {lum["Nom luminaire"] || "Sans nom"}
                        </h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.66rem", color: MUTED, fontStyle: "italic", margin: "0 0 0.1rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Artiste / Dates"]?.split(",")[0] || ""}
                        </p>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.64rem", color: BROWN, margin: 0 }}>
                          {lum["Année"] || lum.annee || lum.year || ""}
                        </p>
                        {!ok && <p style={{ fontSize: "0.6rem", color: MUTED, fontStyle: "italic", margin: "0.2rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                    </div>
                  </W>
                )
              })}
            </div>
          )}

          {/* ── Liste ── */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok   = idx < freeUserLimit
                const isFav= favorites.includes(String(lum._id))
                const hi   = highlightedLuminaire === String(lum._id)
                const W    = ok ? Link : ("div" as any)
                return (
                  <W key={lum._id} data-item-id={String(lum._id)}
                    {...(ok ? { href: `/luminaires/${lum._id}` } : {})} style={{ textDecoration: "none" }}
                    onClick={() => { if (ok) { sessionStorage.setItem("restore_item_luminaires", String(lum._id)); sessionStorage.setItem("restore_from_luminaires", "true"); saveScrollPosition(); saveForRestoration() } }}>
                    <div className={`lum-row${!ok ? " grayscale opacity-50 cursor-not-allowed" : " cursor-pointer"}`}
                      style={{ display: "flex", alignItems: "center", gap: "0.85rem", background: "#fff", border: `1px solid ${hi ? BROWN : LINE}`, borderRadius: "3px", overflow: "hidden", outline: hi ? `2px solid ${BROWN}` : "none" }}>
                      <div style={{ width: 72, height: 72, flexShrink: 0, background: CREAM, position: "relative", overflow: "hidden" }}>
                        {lum.filename
                          ? <Image src={`/api/images/filename/${lum.filename}`} alt={lum["Nom luminaire"] || ""} fill className="object-cover" sizes="72px" loading="lazy" unoptimized />
                          : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem" }}>🏮</div>
                        }
                        {!ok && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(245,241,232,0.5)",fontSize:"1.1rem" }}>🔒</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: "0.5rem 0" }}>
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.84rem", fontWeight: 600, color: TEXT, margin: "0 0 0.15rem", lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Nom luminaire"] || "Sans nom"}
                        </h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.72rem", color: MUTED, fontStyle: "italic", margin: "0 0 0.12rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Artiste / Dates"]?.split(",")[0] || ""}
                        </p>
                        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                          {(lum["Année"] || lum.annee || lum.year) && <span style={{ fontSize: "0.66rem", color: BROWN, fontFamily: "Georgia,serif" }}>{lum["Année"] || lum.annee || lum.year}</span>}
                          {(lum["Catégorie"] || lum.categorie) && <span style={{ fontSize: "0.66rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>{lum["Catégorie"] || lum.categorie}</span>}
                          {(lum["Matériaux"] || lum.materiaux) && <span style={{ fontSize: "0.66rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                            {typeof lum["Matériaux"] === "string" ? lum["Matériaux"].split(",")[0].trim() : (Array.isArray(lum.materiaux) ? lum.materiaux[0] : lum.materiaux)}
                          </span>}
                          {(lum.estimation || lum["Estimation"]) && <span style={{ fontSize: "0.66rem", color: GOLD, fontFamily: "Georgia,serif" }}>{lum.estimation || lum["Estimation"]}</span>}
                        </div>
                        {!ok && <p style={{ fontSize: "0.6rem", color: MUTED, fontStyle: "italic", margin: "0.15rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{ flexShrink: 0, marginRight: "0.65rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem" }}
                          aria-label={isFav ? "Retirer" : "Ajouter aux favoris"}>
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      )}
                    </div>
                  </W>
                )
              })}
            </div>
          )}

          {/* Chargement suivant */}
          {((hasFilters && displayOffset < filteredLuminaires.length) || (loadingMore && !showFavorites && !hasFilters)) && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.5rem 1.2rem", background: "rgba(255,255,255,0.6)", borderRadius: "50px", border: `1px solid ${LINE}` }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: BROWN }} />
                <span style={{ fontSize: "0.78rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>Chargement…</span>
              </div>
            </div>
          )}

          {/* Vide */}
          {displayedLuminaires.length === 0 && !loading && allLuminairesLoaded && (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1.1rem", fontStyle: "italic", color: TEXT, opacity: 0.45 }}>
                {showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}
              </p>
            </div>
          )}

        </main>
      </div>

      {/* Admin FAB */}
      {isAdmin && (
        <Button onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 rounded-full w-14 h-14 shadow-lg text-white"
          style={{ backgroundColor: BROWN }}>
          <Plus className="w-6 h-6" />
        </Button>
      )}

      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />

      <nav className="bottom-nav">
        <Link href="/"           className={`bottom-nav-item ${pathname === "/"                   ? "active" : ""}`}><Home    className="w-5 h-5" /><span>Home</span></Link>
        <Link href="/designers"  className={`bottom-nav-item ${pathname.startsWith("/designers")  ? "active" : ""}`}><Users   className="w-5 h-5" /><span>Designers</span></Link>
        <Link href="/luminaires" className={`bottom-nav-item ${pathname.startsWith("/luminaires") ? "active" : ""}`}><Grid3x3 className="w-5 h-5" /><span>Collection</span></Link>
        <Link href="/recherche"  className={`bottom-nav-item ${pathname === "/recherche"          ? "active" : ""}`}><Mail    className="w-5 h-5" /><span>Inquire</span></Link>
        <Link href="/pricing"    className={`bottom-nav-item ${pathname === "/pricing"            ? "active" : ""}`}><User    className="w-5 h-5" /><span>Account</span></Link>
      </nav>

      <MobileFooter />
    </div>
  )
}
