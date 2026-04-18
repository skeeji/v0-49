"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Home, Users, Grid3x3, Mail, User, Plus, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import MobileFooter from "@/components/MobileFooter"
import { useScrollRestoration, useMarkScrollRestoration } from "@/hooks/useScrollRestoration"

// ─── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES    = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const CAT_LABELS    = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]
const CREAM         = "#f5f1e8"
const SIDEBAR_BG    = "#efebe1"
const BROWN         = "#8b7355"
const TEXT_DARK     = "#3d2b1f"
const BORDER        = "#ddd5c5"

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  // ── Data state ────────────────────────────────────────────────────────────
  const [luminaires,         setLuminaires]         = useState<any[]>([])
  const [allLuminaires,      setAllLuminaires]      = useState<any[]>([])
  const [allLuminairesLoaded,setAllLuminairesLoaded]= useState(false)
  const [loading,            setLoading]            = useState(true)
  const [loadingMore,        setLoadingMore]        = useState(false)
  const [homepageImages,     setHomepageImages]     = useState<Record<string,string>>({})

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState<"grid"|"list">("grid")
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [isModalOpen,  setIsModalOpen]  = useState(false)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchTerm,        setSearchTerm]        = useState("")
  const [selectedCategorie, setSelectedCategorie] = useState("")
  const [selectedMateriau,  setSelectedMateriau]  = useState("")
  const [yearRange,         setYearRange]         = useState<number[]>([1900, 2024])
  const [yearMinInput,      setYearMinInput]      = useState("1900")
  const [yearMaxInput,      setYearMaxInput]      = useState("2024")
  const [sliderModified,    setSliderModified]    = useState(false)
  const [sortField,         setSortField]         = useState("nom")
  const [sortDirection,     setSortDirection]     = useState<"asc"|"desc">("asc")
  const [yearBounds,        setYearBounds]        = useState({ min: 1900, max: 2024 })
  const [selectedDesigner,  setSelectedDesigner]  = useState("")

  // ── Pagination state ──────────────────────────────────────────────────────
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

  // ── Auth / favorites ──────────────────────────────────────────────────────
  const { user, userData } = useAuth()
  const isAdmin   = userData?.role === "admin"
  const isPremium = userData?.role === "admin" || (userData as any)?.isPremium
  const [favorites, setFavorites] = useState<string[]>([])

  // ─── Sync year inputs ──────────────────────────────────────────────────────
  useEffect(() => {
    setYearMinInput(String(yearRange[0]))
    setYearMaxInput(String(yearRange[1]))
  }, [yearRange])

  // ─── Homepage images (catégories) ─────────────────────────────────────────
  useEffect(() => {
    fetch("/api/homepage-images")
      .then(r => r.json())
      .then(d => { if (d.success && d.images) setHomepageImages(d.images) })
      .catch(() => {})
  }, [])

  // ─── URL params ───────────────────────────────────────────────────────────
  useEffect(() => {
    const designer = searchParams.get("designer")
    const yearMin  = searchParams.get("yearMin")
    const yearMax  = searchParams.get("yearMax")
    const categorie= searchParams.get("categorie")
    if (designer)  setSelectedDesigner(designer)
    if (categorie) setSelectedCategorie(categorie)
    if (yearMin && yearMax) {
      const mn = parseInt(yearMin), mx = parseInt(yearMax)
      if (!isNaN(mn) && !isNaN(mx)) { setYearRange([mn, mx]); setSliderModified(true) }
    }
  }, [searchParams])

  // ─── Favorites ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) { setFavorites([]); return }
    fetch(`/api/users/favorites?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setFavorites(d.favorites || []) })
      .catch(e => console.error("Erreur chargement favoris:", e))
  }, [user?.email])

  const toggleFavorite = useCallback(async (luminaireId: string) => {
    if (!user?.email) { toast.error("Vous devez être connecté pour gérer vos favoris"); return }
    const isFav  = favorites.includes(luminaireId)
    const action = isFav ? "remove" : "add"
    setFavorites(prev => isFav ? prev.filter(id => id !== luminaireId) : [...prev, luminaireId])
    try {
      const r = await fetch("/api/users/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, luminaireId, action }),
      })
      const d = await r.json()
      if (!d.success) {
        setFavorites(prev => isFav ? [...prev, luminaireId] : prev.filter(id => id !== luminaireId))
        toast.error("Erreur lors de la mise à jour des favoris")
      }
    } catch {
      setFavorites(prev => isFav ? [...prev, luminaireId] : prev.filter(id => id !== luminaireId))
      toast.error("Erreur lors de la mise à jour des favoris")
    }
  }, [user?.email, favorites])

  // ─── Load all (client-side filters) ──────────────────────────────────────
  const loadAllLuminaires = useCallback(async () => {
    try {
      const r = await fetch("/api/luminaires?limit=10000&page=1")
      const d = await r.json()
      if (d.success) { setAllLuminaires(d.luminaires); setAllLuminairesLoaded(true) }
    } catch (e) { console.error("Erreur chargement données globales:", e) }
  }, [])

  // ─── Paginated fetch ──────────────────────────────────────────────────────
  const fetchLuminaires = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) { setLoading(true) } else { setLoadingMore(true) }
      const params = new URLSearchParams({
        page: page.toString(), limit: "50",
        search: searchTerm, categorie: selectedCategorie,
        materiau: selectedMateriau, sortField, sortDirection,
      })
      const r = await fetch(`/api/luminaires?${params}`)
      const d = await r.json()
      if (d.success) {
        if (append && page > 1) {
          setLuminaires(prev => {
            const ids = new Set(prev.map(l => l._id))
            const fresh = d.luminaires.filter((l: any) => !ids.has(l._id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        } else {
          setLuminaires(d.luminaires)
        }
        setHasMore(d.pagination?.hasMore || false)
        setTotalItems(d.pagination?.total || 0)
      } else {
        throw new Error(d.error || "Erreur lors du chargement")
      }
    } catch (e: any) {
      console.error("Erreur chargement:", e)
      toast.error("Erreur lors du chargement des luminaires")
    } finally {
      setLoading(false); setLoadingMore(false)
    }
  }, [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection])

  useEffect(() => { loadAllLuminaires() }, [loadAllLuminaires])
  useEffect(() => { setCurrentPage(1); fetchLuminaires(1, false) },
    [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection]) // eslint-disable-line

  // ─── Infinite scroll ──────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (selectedDesigner || sliderModified) {
      setDisplayOffset(prev => prev + 50)
    } else if (!loadingMore && hasMore && !loading && !showFavorites) {
      const next = currentPage + 1; setCurrentPage(next); fetchLuminaires(next, true)
    }
  }, [loadingMore, hasMore, loading, currentPage, fetchLuminaires, showFavorites, selectedDesigner, sliderModified])

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

  // ─── Item update / create ─────────────────────────────────────────────────
  const handleItemUpdate = useCallback(async (id: string, updates: any) => {
    try {
      const r = await fetch(`/api/luminaires/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const d = await r.json()
      if (d.success) {
        setLuminaires(prev => prev.map(item => item._id === id ? { ...item, ...updates } : item))
        toast.success("Luminaire mis à jour avec succès")
      } else throw new Error(d.error)
    } catch (e: any) { toast.error("Erreur lors de la mise à jour") }
  }, [])

  const handleCreateLuminaire = useCallback(async (data: any) => {
    try {
      const r = await fetch("/api/luminaires", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const d = await r.json()
      if (d.success) {
        toast.success("Luminaire créé avec succès"); setIsModalOpen(false)
        fetchLuminaires(1, false); loadAllLuminaires()
      } else throw new Error(d.error)
      return d
    } catch (e: any) { toast.error("Erreur lors de la création"); return { success: false, error: e.message } }
  }, [fetchLuminaires, loadAllLuminaires])

  // ─── Filter options ───────────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(allLuminaires.map(l => l.categorie || l["Catégorie"]).filter(Boolean))).sort()
    const matSet = new Set<string>()
    allLuminaires.forEach(l => {
      const v = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(", ") : l.materiaux) || ""
      if (typeof v === "string" && v.trim()) v.split(",").forEach(m => { const s = m.trim(); if (s) matSet.add(s) })
    })
    return { categories, materiaux: (Array.from(matSet) as string[]).sort() }
  }, [allLuminaires])

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

  // ─── Slider handlers ──────────────────────────────────────────────────────
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value); if (v <= yearRange[1]) setYearRange([v, yearRange[1]])
  }
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value); if (v >= yearRange[0]) setYearRange([yearRange[0], v])
  }
  const handleSliderRelease = () => { setSliderModified(true); setDisplayOffset(50) }

  const handleMinInputBlur = () => {
    const v = parseInt(yearMinInput)
    if (!isNaN(v) && v >= yearBounds.min && v <= yearRange[1]) { setYearRange([v, yearRange[1]]); setSliderModified(true); setDisplayOffset(50) }
    else setYearMinInput(String(yearRange[0]))
  }
  const handleMaxInputBlur = () => {
    const v = parseInt(yearMaxInput)
    if (!isNaN(v) && v <= yearBounds.max && v >= yearRange[0]) { setYearRange([yearRange[0], v]); setSliderModified(true); setDisplayOffset(50) }
    else setYearMaxInput(String(yearRange[1]))
  }

  // ─── Filtered / displayed luminaires ─────────────────────────────────────
  const filteredLuminaires = useMemo(() => {
    if (!allLuminairesLoaded || allLuminaires.length === 0) return []
    let f = allLuminaires
    if (selectedDesigner) f = f.filter(l => (l["Artiste / Dates"] || l.designer || "").includes(selectedDesigner))
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
    return f
  }, [allLuminaires, allLuminairesLoaded, yearRange, sliderModified, selectedDesigner])

  const freeUserLimit = isPremium ? Infinity : Math.floor(totalDatabase * 0.1)

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) return allLuminaires.filter(item => favorites.includes(String(item._id || item.id || "")))
    if (selectedDesigner || sliderModified) return filteredLuminaires.slice(0, displayOffset)
    return luminaires
  }, [filteredLuminaires, luminaires, showFavorites, favorites, allLuminaires, selectedDesigner, sliderModified, displayOffset])

  useEffect(() => { setDisplayOffset(50) }, [selectedDesigner, sliderModified, yearRange])

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
    const fromCard = sessionStorage.getItem("restore_from_luminaires")
    if (fromCard !== "true") return
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

  // ─── Loading screens ──────────────────────────────────────────────────────
  if (loading && luminaires.length === 0) return (
    <div className="min-h-screen pb-20" style={{ background: CREAM }}>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto animate-spin mb-4" style={{ color: BROWN }} />
          <p style={{ fontFamily: "Georgia,serif", fontStyle: "italic", color: TEXT_DARK, opacity: 0.7 }}>Chargement de la collection…</p>
        </div>
      </div>
    </div>
  )

  if ((searchParams.get("designer") || searchParams.get("yearMin")) && !allLuminairesLoaded) return (
    <div className="min-h-screen pb-20" style={{ background: CREAM }}>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto animate-spin mb-4" style={{ color: BROWN }} />
          <p style={{ fontFamily: "Georgia,serif", fontStyle: "italic", color: TEXT_DARK, opacity: 0.7 }}>Chargement des filtres…</p>
        </div>
      </div>
    </div>
  )

  const activeCount = selectedDesigner || sliderModified ? filteredLuminaires.length : totalItems
  const rangeWidth  = yearBounds.max - yearBounds.min || 1

  // ─── Sidebar body (inlined in both desktop + mobile) ──────────────────────
  const sidebarBody = (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.4rem" }}>

      {/* Search */}
      <input
        type="text" placeholder="Rechercher un luminaire…"
        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        style={{
          width: "100%", padding: "0.6rem 1rem", borderRadius: "50px",
          border: `1.5px solid ${BORDER}`, background: "rgba(255,255,255,0.85)",
          fontFamily: "system-ui,sans-serif", fontSize: "0.82rem", color: TEXT_DARK,
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
        onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
      />

      <div style={{ borderTop: `1px solid ${BORDER}` }} />

      {/* Categories */}
      <div>
        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.1em", color: BROWN, margin: "0 0 0.7rem" }}>
          Catégories
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.55rem" }}>
          {CATEGORIES.map((cat, i) => {
            const src     = homepageImages[`homepage_luminaire_${i}`] || null
            const isActive= selectedCategorie === cat
            return (
              <button key={cat}
                onClick={() => { setSelectedCategorie(isActive ? "" : cat); setCurrentPage(1) }}
                style={{
                  background: isActive ? "#e8e0d0" : "rgba(255,255,255,0.55)",
                  border: `1.5px solid ${isActive ? BROWN : BORDER}`,
                  borderRadius: "4px", overflow: "hidden", cursor: "pointer",
                  padding: 0, outline: "none", transition: "border-color 0.2s",
                }}
              >
                <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#e8e0d0" }}>
                  {src
                    ? <img src={src} alt={CAT_LABELS[i]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🏮</div>
                  }
                </div>
                <p style={{
                  fontFamily: "Georgia,serif", fontSize: "0.6rem", letterSpacing: "0.08em",
                  textTransform: "uppercase", color: isActive ? BROWN : TEXT_DARK,
                  padding: "0.32rem 0.2rem", margin: 0, fontWeight: isActive ? 600 : 400,
                }}>
                  {CAT_LABELS[i]}
                </p>
              </button>
            )
          })}
        </div>
        {selectedCategorie && (
          <button onClick={() => setSelectedCategorie("")}
            style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: BROWN, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Effacer la catégorie
          </button>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}` }} />

      {/* Chronological slider */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
          <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.1em", color: BROWN, margin: 0 }}>
            Période
          </p>
          {sliderModified && (
            <button onClick={() => { setYearRange([yearBounds.min, yearBounds.max]); setSliderModified(false); setCurrentPage(1) }}
              style={{ fontSize: "0.72rem", color: BROWN, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Réinitialiser
            </button>
          )}
        </div>

        {/* Dual range slider */}
        <div style={{ position: "relative", width: "100%", height: "36px" }}>
          {/* Track */}
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: "3px", background: "#ddd5c5", borderRadius: "2px" }} />
          {/* Active range */}
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)", height: "3px",
            background: BROWN, borderRadius: "2px", pointerEvents: "none",
            left:  `${((yearRange[0] - yearBounds.min) / rangeWidth) * 100}%`,
            right: `${100 - ((yearRange[1] - yearBounds.min) / rangeWidth) * 100}%`,
          }} />
          <input type="range"
            min={yearBounds.min} max={yearBounds.max} value={yearRange[0]}
            onChange={handleMinChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: "3px", WebkitAppearance: "none", appearance: "none", background: "transparent", pointerEvents: "none", margin: 0, zIndex: 2 }}
            className="lum-slider"
          />
          <input type="range"
            min={yearBounds.min} max={yearBounds.max} value={yearRange[1]}
            onChange={handleMaxChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: "3px", WebkitAppearance: "none", appearance: "none", background: "transparent", pointerEvents: "none", margin: 0, zIndex: 4 }}
            className="lum-slider"
          />
        </div>

        {/* Manual year inputs */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "center" }}>
          <input type="text" value={yearMinInput}
            onChange={e => setYearMinInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderColor = BORDER; handleMinInputBlur() }}
            onKeyDown={e => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }}
            style={{ width: "62px", padding: "0.3rem 0.4rem", border: `1.5px solid ${BORDER}`, borderRadius: "4px", fontSize: "0.78rem", fontFamily: "system-ui,sans-serif", color: TEXT_DARK, background: "rgba(255,255,255,0.8)", textAlign: "center", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          />
          <span style={{ color: BROWN, fontSize: "0.8rem" }}>—</span>
          <input type="text" value={yearMaxInput}
            onChange={e => setYearMaxInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderColor = BORDER; handleMaxInputBlur() }}
            onKeyDown={e => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }}
            style={{ width: "62px", padding: "0.3rem 0.4rem", border: `1.5px solid ${BORDER}`, borderRadius: "4px", fontSize: "0.78rem", fontFamily: "system-ui,sans-serif", color: TEXT_DARK, background: "rgba(255,255,255,0.8)", textAlign: "center", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}` }} />

      {/* Materials */}
      <div>
        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.1em", color: BROWN, margin: "0 0 0.5rem" }}>
          Matériaux
        </p>
        <select value={selectedMateriau} onChange={e => { setSelectedMateriau(e.target.value); setCurrentPage(1) }}
          style={{ width: "100%", padding: "0.5rem 0.65rem", border: `1.5px solid ${BORDER}`, borderRadius: "4px", background: "rgba(255,255,255,0.8)", fontSize: "0.8rem", fontFamily: "system-ui,sans-serif", color: TEXT_DARK, outline: "none" }}>
          <option value="">Tous les matériaux</option>
          {filterOptions.materiaux.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}` }} />

      {/* Sort */}
      <div>
        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.1em", color: BROWN, margin: "0 0 0.5rem" }}>
          Trier par
        </p>
        <select value={`${sortField}-${sortDirection}`}
          onChange={e => { const [f, d] = e.target.value.split("-"); setSortField(f); setSortDirection(d as "asc"|"desc") }}
          style={{ width: "100%", padding: "0.5rem 0.65rem", border: `1.5px solid ${BORDER}`, borderRadius: "4px", background: "rgba(255,255,255,0.8)", fontSize: "0.8rem", fontFamily: "system-ui,sans-serif", color: TEXT_DARK, outline: "none" }}>
          <option value="nom-asc">Nom A–Z</option>
          <option value="nom-desc">Nom Z–A</option>
          <option value="annee-asc">Année croissante</option>
          <option value="annee-desc">Année décroissante</option>
        </select>
      </div>

    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20" style={{ background: CREAM }}>

      {/* Global CSS */}
      <style jsx global>{`
        .lum-slider { pointer-events: none !important; }
        .lum-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: ${BROWN}; cursor: pointer; pointer-events: auto !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .lum-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: ${BROWN}; cursor: pointer; pointer-events: auto !important;
          border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .lum-card { transition: box-shadow 0.2s, transform 0.18s; }
        .lum-card:hover { box-shadow: 0 6px 24px rgba(139,115,85,0.18); transform: translateY(-2px); }
        .lum-row { transition: box-shadow 0.2s; }
        .lum-row:hover { box-shadow: 0 3px 14px rgba(139,115,85,0.14); }
        .lum-fav { opacity: 0; transition: opacity 0.2s; }
        .lum-card:hover .lum-fav, .lum-row:hover .lum-fav, .lum-fav.is-fav { opacity: 1 !important; }
      `}</style>

      <div style={{ display: "flex" }}>

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden md:block" style={{
          width: "272px", flexShrink: 0, position: "sticky", top: 0,
          height: "100vh", overflowY: "auto",
          background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}`,
        }}>
          <div style={{ padding: "1.4rem 1.25rem 0.75rem", borderBottom: `1px solid ${BORDER}` }}>
            <h1 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1.4rem", fontWeight: 600, color: TEXT_DARK, margin: 0 }}>
              Collection
            </h1>
            <p style={{ fontFamily: "Georgia,serif", fontSize: "0.75rem", color: BROWN, fontStyle: "italic", margin: "0.2rem 0 0" }}>
              {activeCount.toLocaleString()} luminaires
            </p>
          </div>
          {sidebarBody}
        </aside>

        {/* ── Mobile Sidebar Overlay ── */}
        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}
              onClick={() => setSidebarOpen(false)} />
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: "min(310px,90vw)", background: SIDEBAR_BG,
              borderRight: `1px solid ${BORDER}`, overflowY: "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${BORDER}` }}>
                <h2 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1.1rem", fontWeight: 600, color: TEXT_DARK, margin: 0 }}>Filtres</h2>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DARK, padding: "0.2rem", display: "flex" }}>
                  <X size={20} />
                </button>
              </div>
              {sidebarBody}
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <main style={{ flex: 1, minWidth: 0, padding: "1.5rem 1.25rem 2rem" }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem", gap: "0.75rem", flexWrap: "wrap" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              {/* Mobile: filter button */}
              <button className="md:hidden"
                onClick={() => setSidebarOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.42rem 0.9rem", borderRadius: "50px",
                  border: `1.5px solid ${BORDER}`, background: "rgba(255,255,255,0.7)",
                  fontSize: "0.78rem", color: TEXT_DARK, cursor: "pointer", fontFamily: "system-ui,sans-serif",
                }}>
                <SlidersHorizontal size={14} /> Filtres
              </button>
              {/* Desktop: count */}
              <p className="hidden md:block"
                style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1rem", fontStyle: "italic", color: TEXT_DARK, margin: 0 }}>
                {activeCount.toLocaleString()} luminaires
              </p>
              {/* Mobile: count */}
              <p className="md:hidden"
                style={{ fontFamily: "Georgia,serif", fontSize: "0.8rem", color: BROWN, fontStyle: "italic", margin: 0 }}>
                {activeCount.toLocaleString()} résultats
              </p>
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.7)", border: `1.5px solid ${BORDER}`, borderRadius: "7px", overflow: "hidden" }}>
              {(["grid","list"] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  title={mode === "grid" ? "Vue grille" : "Vue liste"}
                  style={{
                    padding: "0.42rem 0.65rem", border: "none", cursor: "pointer",
                    background: viewMode === mode ? BROWN : "transparent",
                    color: viewMode === mode ? "#fff" : TEXT_DARK,
                    transition: "all 0.18s", display: "flex", alignItems: "center",
                  }}>
                  {mode === "grid" ? <LayoutGrid size={16} /> : <List size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Premium banner */}
          {(!user || (userData?.role !== "premium" && userData?.role !== "admin")) && (
            <div style={{
              marginBottom: "1.1rem", borderRadius: "8px", padding: "0.8rem 1rem",
              background: "rgba(255,255,255,0.55)", border: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap",
            }}>
              <div>
                <p style={{ fontFamily: "system-ui,sans-serif", fontSize: "0.82rem", fontWeight: 600, color: TEXT_DARK, margin: "0 0 0.15rem" }}>
                  Accès limité — vous voyez 10% de la collection
                </p>
                <p style={{ fontFamily: "Georgia,serif", fontSize: "0.74rem", color: "#7a6654", margin: 0, fontStyle: "italic" }}>
                  Passez à Premium pour accéder à l'intégralité des luminaires
                </p>
              </div>
              <Link href="/pricing">
                <button style={{ padding: "0.38rem 1rem", borderRadius: "50px", border: `1.5px solid ${BROWN}`, background: BROWN, color: "#fff", fontSize: "0.78rem", cursor: "pointer", fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap" }}>
                  Découvrir Premium →
                </button>
              </Link>
            </div>
          )}

          {/* ── Grid view ── */}
          {viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.85rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok         = idx < freeUserLimit
                const isFav      = favorites.includes(String(lum._id))
                const highlighted= highlightedLuminaire === String(lum._id)
                const Wrapper    = ok ? Link : ("div" as any)
                return (
                  <Wrapper key={lum._id} data-item-id={String(lum._id)}
                    {...(ok ? { href: `/luminaires/${lum._id}` } : {})}
                    style={{ textDecoration: "none" }}
                    onClick={() => {
                      if (ok) {
                        sessionStorage.setItem("restore_item_luminaires", String(lum._id))
                        sessionStorage.setItem("restore_from_luminaires", "true")
                        saveScrollPosition(); saveForRestoration()
                      }
                    }}>
                    <div className={`lum-card${!ok ? " grayscale opacity-50 cursor-not-allowed" : " cursor-pointer"}`}
                      style={{
                        background: "#fff", borderRadius: "5px", overflow: "hidden",
                        border: `1px solid ${highlighted ? BROWN : BORDER}`,
                        outline: highlighted ? `2px solid ${BROWN}` : "none",
                        position: "relative",
                      }}>
                      {/* Fav button */}
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{
                            position: "absolute", top: 5, right: 5, zIndex: 5,
                            background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%",
                            width: 27, height: 27, display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: "0.78rem", boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                          }}
                          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      )}
                      {/* Image */}
                      <div style={{ aspectRatio: "1/1", background: CREAM, position: "relative", overflow: "hidden" }}>
                        {lum.filename
                          ? <Image src={`/api/images/filename/${lum.filename}`} alt={lum["Nom luminaire"] || "Luminaire"} fill className="object-cover" sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,20vw" loading="lazy" unoptimized />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🏮</div>
                        }
                        {!ok && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,241,232,0.55)", fontSize: "1.4rem" }}>🔒</div>}
                      </div>
                      {/* Info */}
                      <div style={{ padding: "0.55rem 0.6rem 0.65rem" }}>
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.78rem", fontWeight: 600, color: TEXT_DARK, margin: "0 0 0.18rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {lum["Nom luminaire"] || "Sans nom"}
                        </h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.68rem", color: "#7a6654", fontStyle: "italic", margin: "0 0 0.12rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Artiste / Dates"]?.split(",")[0] || ""}
                        </p>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.66rem", color: BROWN, margin: 0, opacity: 0.85 }}>
                          {lum["Année"] || lum.annee || lum.year || ""}
                        </p>
                        {!ok && <p style={{ fontSize: "0.62rem", color: "#9a8060", fontStyle: "italic", margin: "0.25rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                    </div>
                  </Wrapper>
                )
              })}
            </div>
          )}

          {/* ── List view ── */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok         = idx < freeUserLimit
                const isFav      = favorites.includes(String(lum._id))
                const highlighted= highlightedLuminaire === String(lum._id)
                const Wrapper    = ok ? Link : ("div" as any)
                return (
                  <Wrapper key={lum._id} data-item-id={String(lum._id)}
                    {...(ok ? { href: `/luminaires/${lum._id}` } : {})}
                    style={{ textDecoration: "none" }}
                    onClick={() => {
                      if (ok) {
                        sessionStorage.setItem("restore_item_luminaires", String(lum._id))
                        sessionStorage.setItem("restore_from_luminaires", "true")
                        saveScrollPosition(); saveForRestoration()
                      }
                    }}>
                    <div className={`lum-row${!ok ? " grayscale opacity-50 cursor-not-allowed" : " cursor-pointer"}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.9rem",
                        background: "#fff", border: `1px solid ${highlighted ? BROWN : BORDER}`,
                        borderRadius: "5px", overflow: "hidden",
                        outline: highlighted ? `2px solid ${BROWN}` : "none",
                      }}>
                      {/* Image */}
                      <div style={{ width: 76, height: 76, flexShrink: 0, background: CREAM, position: "relative", overflow: "hidden" }}>
                        {lum.filename
                          ? <Image src={`/api/images/filename/${lum.filename}`} alt={lum["Nom luminaire"] || ""} fill className="object-cover" sizes="76px" loading="lazy" unoptimized />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🏮</div>
                        }
                        {!ok && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,241,232,0.55)", fontSize: "1.2rem" }}>🔒</div>}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, padding: "0.55rem 0" }}>
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.86rem", fontWeight: 600, color: TEXT_DARK, margin: "0 0 0.18rem", lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Nom luminaire"] || "Sans nom"}
                        </h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.73rem", color: "#7a6654", fontStyle: "italic", margin: "0 0 0.15rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {lum["Artiste / Dates"]?.split(",")[0] || ""}
                        </p>
                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                          {(lum["Année"] || lum.annee || lum.year) && <span style={{ fontSize: "0.68rem", color: BROWN, fontFamily: "Georgia,serif" }}>{lum["Année"] || lum.annee || lum.year}</span>}
                          {(lum["Catégorie"] || lum.categorie) && <span style={{ fontSize: "0.68rem", color: "#9a8060", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{lum["Catégorie"] || lum.categorie}</span>}
                          {(lum["Matériaux"] || lum.materiaux) && <span style={{ fontSize: "0.68rem", color: "#9a8060", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                            {typeof lum["Matériaux"] === "string" ? lum["Matériaux"].split(",")[0].trim() : (Array.isArray(lum.materiaux) ? lum.materiaux[0] : lum.materiaux)}
                          </span>}
                        </div>
                        {!ok && <p style={{ fontSize: "0.62rem", color: "#9a8060", fontStyle: "italic", margin: "0.2rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                      {/* Fav */}
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{ flexShrink: 0, marginRight: "0.75rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.88rem", padding: "0.25rem" }}
                          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      )}
                    </div>
                  </Wrapper>
                )
              })}
            </div>
          )}

          {/* Loading more */}
          {(((selectedDesigner || sliderModified) && displayOffset < filteredLuminaires.length) ||
            (loadingMore && !showFavorites && !(selectedDesigner || sliderModified))) && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1.25rem", background: "rgba(255,255,255,0.7)", borderRadius: "50px", border: `1px solid ${BORDER}` }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: BROWN }} />
                <span style={{ fontSize: "0.8rem", color: TEXT_DARK, fontFamily: "Georgia,serif", fontStyle: "italic" }}>Chargement…</span>
              </div>
            </div>
          )}

          {/* Empty */}
          {displayedLuminaires.length === 0 && !loading && allLuminairesLoaded && (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1.1rem", fontStyle: "italic", color: TEXT_DARK, opacity: 0.55 }}>
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

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <Link href="/"           className={`bottom-nav-item ${pathname === "/"                        ? "active" : ""}`}><Home    className="w-5 h-5" /><span>Home</span></Link>
        <Link href="/designers"  className={`bottom-nav-item ${pathname.startsWith("/designers")       ? "active" : ""}`}><Users   className="w-5 h-5" /><span>Designers</span></Link>
        <Link href="/luminaires" className={`bottom-nav-item ${pathname.startsWith("/luminaires")      ? "active" : ""}`}><Grid3x3 className="w-5 h-5" /><span>Collection</span></Link>
        <Link href="/recherche"  className={`bottom-nav-item ${pathname === "/recherche"               ? "active" : ""}`}><Mail    className="w-5 h-5" /><span>Inquire</span></Link>
        <Link href="/pricing"    className={`bottom-nav-item ${pathname === "/pricing"                 ? "active" : ""}`}><User    className="w-5 h-5" /><span>Account</span></Link>
      </nav>

      <MobileFooter />
    </div>
  )
}
