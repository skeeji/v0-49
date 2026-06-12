"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Plus, LayoutGrid, List, SlidersHorizontal, X, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import { useScrollRestoration, useMarkScrollRestoration } from "@/hooks/useScrollRestoration"

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne", "Plafonnier"]
const CAT_LABELS  = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes", "Plafonniers"]

const CREAM = "#f5f1e8"
const BROWN = "#8b7355"
const GOLD  = "#b8974a"
const TEXT  = "#3d2b1f"
const MUTED = "#7a6654"
const LINE  = "#d8d0c0"

const EST_RANGES = [
  { label: "Tous les prix", value: "" },
  { label: "Moins de 1 000€", value: "0-1000" },
  { label: "1 000€ – 3 000€", value: "1000-3000" },
  { label: "3 000€ – 10 000€", value: "3000-10000" },
  { label: "Plus de 10 000€", value: "10000+" },
]

function FilterSection({ title, isOpen, onToggle, children }: {
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: `1px solid ${LINE}` }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.2rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontFamily: "Georgia,serif", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT, fontWeight: 700 }}>{title}</span>
        <ChevronDown size={13} style={{ color: MUTED, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {isOpen && <div style={{ padding: "0 1.2rem 0.85rem" }}>{children}</div>}
    </div>
  )
}

function RadioOpt({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.2rem 0", cursor: "pointer" }}>
      <input type="radio" checked={checked} onChange={onChange} style={{ cursor: "pointer", accentColor: BROWN, width: 14, height: 14, flexShrink: 0, margin: 0 }} />
      <span style={{ fontFamily: "Georgia,serif", fontSize: "0.78rem", color: checked ? TEXT : MUTED, lineHeight: 1.3 }}>{label}</span>
    </label>
  )
}

function SearchableList({ search, onSearch, placeholder, options, value, onChange, allLabel }: {
  search: string; onSearch: (v: string) => void; placeholder: string
  options: string[]; value: string; onChange: (v: string) => void; allLabel: string
}) {
  const filtered = search.trim() ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options
  return (
    <>
      <div style={{ marginBottom: "0.5rem" }}>
        <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "0.38rem 0.55rem", border: `1px solid ${LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.75rem", color: TEXT, outline: "none", boxSizing: "border-box" }}
          onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          onBlur={e  => (e.currentTarget.style.borderColor = LINE)}
        />
      </div>
      <div style={{ maxHeight: "180px", overflowY: "auto", scrollbarWidth: "none" }}>
        <RadioOpt label={allLabel} checked={!value} onChange={() => onChange("")} />
        {filtered.slice(0, 30).map(o => (
          <RadioOpt key={o} label={o} checked={value === o} onChange={() => onChange(o)} />
        ))}
        {filtered.length > 30 && <p style={{ fontFamily: "Georgia,serif", fontSize: "0.68rem", color: MUTED, fontStyle: "italic", margin: "0.3rem 0 0" }}>Affiner la recherche…</p>}
      </div>
    </>
  )
}

function DimRange({ label, minVal, maxVal, onMin, onMax }: { label: string; minVal: string; maxVal: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, margin: "0 0 0.3rem", fontWeight: 600 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <input type="number" value={minVal} onChange={e => onMin(e.target.value)} placeholder="min"
          style={{ flex: 1, minWidth: 0, padding: "0.35rem 0.4rem", border: `1px solid ${minVal ? BROWN : LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.74rem", color: TEXT, outline: "none", textAlign: "center" }}
          onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          onBlur={e  => (e.currentTarget.style.borderColor = minVal ? BROWN : LINE)}
        />
        <span style={{ fontFamily: "Georgia,serif", color: MUTED, fontSize: "0.75rem", flexShrink: 0 }}>–</span>
        <input type="number" value={maxVal} onChange={e => onMax(e.target.value)} placeholder="max"
          style={{ flex: 1, minWidth: 0, padding: "0.35rem 0.4rem", border: `1px solid ${maxVal ? BROWN : LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.74rem", color: TEXT, outline: "none", textAlign: "center" }}
          onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          onBlur={e  => (e.currentTarget.style.borderColor = maxVal ? BROWN : LINE)}
        />
        <span style={{ fontFamily: "Georgia,serif", fontSize: "0.64rem", color: MUTED, flexShrink: 0 }}>mm</span>
      </div>
    </div>
  )
}

function parseDimValue(dimStr: string): { h: number; w: number; d: number } {
  const result = { h: 0, w: 0, d: 0 }
  if (!dimStr) return result
  const s = String(dimStr).toLowerCase()
  const toMm = (v: string) => parseFloat(v.replace(",", ".")) * 10
  const hM = s.match(/(?:h(?:auteur)?|height)\s*:?\s*(\d+(?:[.,]\d+)?)/)
  const wM = s.match(/(?:l(?:arg(?:eur)?)?|width)\s*:?\s*(\d+(?:[.,]\d+)?)/)
  const dM = s.match(/(?:p(?:rof(?:ondeur)?)?|d(?:epth)?)\s*:?\s*(\d+(?:[.,]\d+)?)/)
  if (hM) result.h = toMm(hM[1])
  if (wM) result.w = toMm(wM[1])
  if (dM) result.d = toMm(dM[1])
  if (!result.h && !result.w) {
    const parts = s.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×)\s*(\d+(?:[.,]\d+)?)(?:\s*(?:x|×)\s*(\d+(?:[.,]\d+)?))?/)
    if (parts) { result.h = toMm(parts[1]); if (parts[2]) result.w = toMm(parts[2]); if (parts[3]) result.d = toMm(parts[3]) }
  }
  return result
}

function parseEstNum(estStr: string): number {
  if (!estStr) return -1
  const nums = String(estStr).replace(/[€\s]/g, "").match(/\d+/)
  return nums ? parseInt(nums[0]) : -1
}

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  const [luminaires,          setLuminaires]          = useState<any[]>([])
  const [allLuminaires,       setAllLuminaires]       = useState<any[]>([])
  const [allLuminairesLoaded, setAllLuminairesLoaded] = useState(false)
  const [loading,             setLoading]             = useState(true)
  const [loadingMore,         setLoadingMore]         = useState(false)
  const [homepageImages,      setHomepageImages]      = useState<Record<string,string>>({})

  const [viewMode,         setViewMode]         = useState<"grid"|"list">("grid")
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isModalOpen,      setIsModalOpen]      = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    recherche: true, categorie: true, periode: true,
    createur: false, materiaux: true, couleur: false,
    dimensions: false, estimation: false, editeur: false, tri: false,
  })
  const toggleSection = (s: string) => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }))

  const [searchTerm,        setSearchTerm]        = useState("")
  const [selectedCategorie, setSelectedCategorie] = useState("")
  const [selectedMateriau,  setSelectedMateriau]  = useState("")
  const [selectedCouleur,   setSelectedCouleur]   = useState("")
  const [selectedCreateur,  setSelectedCreateur]  = useState("")
  const [selectedEditeur,   setSelectedEditeur]   = useState("")
  const [selectedEstimation,setSelectedEstimation]= useState("")
  const [selectedDesigner,  setSelectedDesigner]  = useState("")

  const [creatorSearch,  setCreatorSearch]  = useState("")
  const [materiauxSearch,setMateriauxSearch]= useState("")
  const [editeurSearch,  setEditeurSearch]  = useState("")

  const [estimationMin, setEstimationMin] = useState("")
  const [estimationMax, setEstimationMax] = useState("")

  const [dimHauteurMin,    setDimHauteurMin]    = useState("")
  const [dimHauteurMax,    setDimHauteurMax]    = useState("")
  const [dimLargeurMin,    setDimLargeurMin]    = useState("")
  const [dimLargeurMax,    setDimLargeurMax]    = useState("")
  const [dimProfondeurMin, setDimProfondeurMin] = useState("")
  const [dimProfondeurMax, setDimProfondeurMax] = useState("")

  const [yearRange,      setYearRange]      = useState<number[]>([1900, 2024])
  const [yearMinInput,   setYearMinInput]   = useState("1900")
  const [yearMaxInput,   setYearMaxInput]   = useState("2024")
  const [sliderModified, setSliderModified] = useState(false)
  const [yearBounds,     setYearBounds]     = useState({ min: 1900, max: 2024 })

  const [sortField,     setSortField]     = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc"|"desc">("asc")

  const [currentPage,   setCurrentPage]   = useState(1)
  const [totalItems,    setTotalItems]    = useState(0)
  const [totalDatabase, setTotalDatabase] = useState(9007)
  const [hasMore,       setHasMore]       = useState(true)
  const [displayOffset, setDisplayOffset] = useState(50)
  const [showFavorites, setShowFavorites] = useState(false)

  const [highlightedLuminaire, setHighlightedLuminaire] = useState<string|null>(null)
  const [pendingHighlightId,   setPendingHighlightId]   = useState<string|null>(null)
  const restorationDoneRef = useRef(false)

  const { user, userData } = useAuth()
  const isAdmin   = userData?.role === "admin"
  const isPremium = userData?.role === "admin" || (userData as any)?.isPremium
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => { setYearMinInput(String(yearRange[0])); setYearMaxInput(String(yearRange[1])) }, [yearRange])

  useEffect(() => {
    fetch("/api/homepage-images").then(r => r.json())
      .then(d => { if (d.success && d.images) setHomepageImages(d.images) }).catch(() => {})
  }, [])

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

  const loadAllLuminaires = useCallback(async () => {
    try {
      const r = await fetch("/api/luminaires?limit=10000&page=1")
      const d = await r.json()
      if (d.success) { setAllLuminaires(d.luminaires); setAllLuminairesLoaded(true) }
    } catch (e) { console.error(e) }
  }, [])

  const fetchLuminaires = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true); else setLoadingMore(true)
      const params = new URLSearchParams({ page: page.toString(), limit: "50", sortField, sortDirection })
      const r = await fetch(`/api/luminaires?${params}`)
      const d = await r.json()
      if (d.success) {
        if (append && page > 1) {
          setLuminaires(prev => {
            const ids = new Set(prev.map((l: any) => l._id))
            const fresh = d.luminaires.filter((l: any) => !ids.has(l._id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        } else { setLuminaires(d.luminaires) }
        setHasMore(d.pagination?.hasMore || false)
        setTotalItems(d.pagination?.total || 0)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [sortField, sortDirection])

  useEffect(() => { loadAllLuminaires() }, [loadAllLuminaires])
  useEffect(() => { setCurrentPage(1); fetchLuminaires(1, false) }, [sortField, sortDirection]) // eslint-disable-line

  const hasDimFilter = !!(dimHauteurMin || dimHauteurMax || dimLargeurMin || dimLargeurMax || dimProfondeurMin || dimProfondeurMax)
  const hasEstFilter = !!(selectedEstimation || estimationMin || estimationMax)

  const hasFilters = !!(searchTerm || selectedCategorie || selectedMateriau || selectedCouleur ||
    selectedCreateur || selectedEditeur || hasDimFilter || hasEstFilter || selectedDesigner || sliderModified)

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

  const filterOptions = useMemo(() => {
    if (!allLuminairesLoaded) return { categories: [], materiaux: [], couleurs: [], editeurs: [], createurs: [] }
    const cats = Array.from(new Set(allLuminaires.map(l => l.categorie || l["Catégorie"]).filter(Boolean))).sort() as string[]
    const matSet = new Set<string>()
    const colSet = new Set<string>()
    const edtSet = new Set<string>()
    const crtSet = new Set<string>()
    allLuminaires.forEach(l => {
      const mat = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(", ") : l.materiaux) || ""
      if (typeof mat === "string" && mat.trim()) mat.split(",").forEach((m: string) => { const s = m.trim(); if (s) matSet.add(s) })
      const col = l.couleurs || l["Couleur"] || l["Couleurs"] || []
      if (Array.isArray(col)) col.forEach((c: string) => { if (c?.trim()) colSet.add(c.trim()) })
      else if (typeof col === "string" && col.trim()) col.split(",").forEach((c: string) => { const s = c.trim(); if (s) colSet.add(s) })
      const edt = l.editeur || l["Editeur"] || l["Éditeur"] || ""
      if (typeof edt === "string" && edt.trim()) edtSet.add(edt.trim())
      const crt = l["Artiste / Dates"] || l.designer || l.artiste || ""
      if (typeof crt === "string" && crt.trim()) { const name = crt.split(",")[0].trim(); if (name) crtSet.add(name) }
    })
    return {
      categories: cats,
      materiaux:  (Array.from(matSet) as string[]).sort(),
      couleurs:   (Array.from(colSet) as string[]).sort(),
      editeurs:   (Array.from(edtSet) as string[]).sort(),
      createurs:  (Array.from(crtSet) as string[]).sort(),
    }
  }, [allLuminaires, allLuminairesLoaded])

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

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value); if (v <= yearRange[1]) setYearRange([v, yearRange[1]]) }
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value); if (v >= yearRange[0]) setYearRange([yearRange[0], v]) }
  const handleSliderRelease = () => { setSliderModified(true); setDisplayOffset(50) }
  const handleMinBlur = () => { const v = parseInt(yearMinInput); if (!isNaN(v) && v >= yearBounds.min && v <= yearRange[1]) { setYearRange([v, yearRange[1]]); setSliderModified(true); setDisplayOffset(50) } else setYearMinInput(String(yearRange[0])) }
  const handleMaxBlur = () => { const v = parseInt(yearMaxInput); if (!isNaN(v) && v <= yearBounds.max && v >= yearRange[0]) { setYearRange([yearRange[0], v]); setSliderModified(true); setDisplayOffset(50) } else setYearMaxInput(String(yearRange[1])) }

  const filteredLuminaires = useMemo(() => {
    if (!allLuminairesLoaded || allLuminaires.length === 0) return []
    let f = allLuminaires
    if (searchTerm) { const q = searchTerm.toLowerCase(); f = f.filter(l => (l["Nom luminaire"] || l.nom || "").toLowerCase().includes(q) || (l["Artiste / Dates"] || l.designer || "").toLowerCase().includes(q)) }
    if (selectedCategorie) f = f.filter(l => (l.categorie || l["Catégorie"] || "") === selectedCategorie)
    if (selectedMateriau) { const q = selectedMateriau.toLowerCase(); f = f.filter(l => { const m = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(",") : l.materiaux) || ""; return String(m).toLowerCase().includes(q) }) }
    if (selectedCouleur) { const q = selectedCouleur.toLowerCase(); f = f.filter(l => { const c = l.couleurs || l["Couleur"] || l["Couleurs"] || []; const s = Array.isArray(c) ? c.join(",") : String(c); return s.toLowerCase().includes(q) }) }
    if (selectedCreateur) { const q = selectedCreateur.toLowerCase(); f = f.filter(l => (l["Artiste / Dates"] || l.designer || "").toLowerCase().includes(q)) }
    if (selectedEditeur)  { const q = selectedEditeur.toLowerCase();  f = f.filter(l => (l.editeur || l["Editeur"] || l["Éditeur"] || "").toLowerCase().includes(q)) }
    if (selectedDesigner) f = f.filter(l => (l["Artiste / Dates"] || l.designer || "").includes(selectedDesigner))
    if (sliderModified) {
      f = f.filter(l => { const a = l["Année"] || l.annee || l.year; if (!a) return false; const m = String(a).match(/\b(1[0-9]{3}|20[0-9]{2})\b/); if (!m) return false; const y = parseInt(m[0]); return !isNaN(y) && y >= yearRange[0] && y <= yearRange[1] })
    }
    if (hasEstFilter) {
      f = f.filter(l => {
        const estNum = parseEstNum(l.estimation || l["Estimation"] || "")
        if (estNum < 0) return false
        if (selectedEstimation) {
          if (selectedEstimation === "10000+") return estNum >= 10000
          const [rMin, rMax] = selectedEstimation.split("-").map(Number)
          return estNum >= rMin && estNum <= rMax
        }
        const cMin = estimationMin ? parseInt(estimationMin) : 0
        const cMax = estimationMax ? parseInt(estimationMax) : Infinity
        return estNum >= cMin && (isNaN(cMax) ? true : estNum <= cMax)
      })
    }
    if (hasDimFilter) {
      f = f.filter(l => {
        const dims = parseDimValue(l.dimensions || l["Dimensions"] || "")
        if (dimHauteurMin || dimHauteurMax) {
          if (dims.h <= 0) return false
          if (dimHauteurMin && dims.h < parseInt(dimHauteurMin)) return false
          if (dimHauteurMax && dims.h > parseInt(dimHauteurMax)) return false
        }
        if (dimLargeurMin || dimLargeurMax) {
          if (dims.w <= 0) return false
          if (dimLargeurMin && dims.w < parseInt(dimLargeurMin)) return false
          if (dimLargeurMax && dims.w > parseInt(dimLargeurMax)) return false
        }
        if (dimProfondeurMin || dimProfondeurMax) {
          if (dims.d <= 0) return false
          if (dimProfondeurMin && dims.d < parseInt(dimProfondeurMin)) return false
          if (dimProfondeurMax && dims.d > parseInt(dimProfondeurMax)) return false
        }
        return true
      })
    }
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
      selectedCouleur, selectedCreateur, selectedEditeur, selectedDesigner, sliderModified, yearRange,
      selectedEstimation, estimationMin, estimationMax,
      dimHauteurMin, dimHauteurMax, dimLargeurMin, dimLargeurMax, dimProfondeurMin, dimProfondeurMax,
      hasDimFilter, hasEstFilter, sortField, sortDirection])

  const freeUserLimit = isPremium ? Infinity : Math.floor(totalDatabase * 0.1)

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) return allLuminaires.filter(item => favorites.includes(String(item._id || "")))
    if (hasFilters) return filteredLuminaires.slice(0, displayOffset)
    return luminaires
  }, [filteredLuminaires, luminaires, showFavorites, favorites, allLuminaires, hasFilters, displayOffset])

  useEffect(() => { setDisplayOffset(50) }, [searchTerm, selectedCategorie, selectedMateriau,
    selectedCouleur, selectedCreateur, selectedEditeur, selectedEstimation, estimationMin, estimationMax,
    dimHauteurMin, dimHauteurMax, dimLargeurMin, dimLargeurMax, dimProfondeurMin, dimProfondeurMax,
    selectedDesigner, sliderModified, yearRange])

  const activeCount = hasFilters ? filteredLuminaires.length : totalItems

  const resetAllFilters = () => {
    setSearchTerm(""); setSelectedCategorie(""); setSelectedMateriau(""); setSelectedCouleur("")
    setSelectedCreateur(""); setSelectedEditeur(""); setSelectedEstimation(""); setSelectedDesigner("")
    setEstimationMin(""); setEstimationMax("")
    setDimHauteurMin(""); setDimHauteurMax(""); setDimLargeurMin(""); setDimLargeurMax(""); setDimProfondeurMin(""); setDimProfondeurMax("")
    setYearRange([yearBounds.min, yearBounds.max]); setSliderModified(false); setCurrentPage(1)
  }

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

  if (loading && luminaires.length === 0) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: BROWN }} />
    </div>
  )
  if ((searchParams.get("designer") || searchParams.get("yearMin")) && !allLuminairesLoaded) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: BROWN }} />
    </div>
  )

  const rangeWidth = yearBounds.max - yearBounds.min || 1

  const SidebarInner = (
    <div>
      {/* Recherche */}
      <div style={{ padding: "1rem 1.2rem", borderBottom: `1px solid ${LINE}` }}>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher…"
          style={{ width: "100%", padding: "0.45rem 0.6rem", border: `1px solid ${searchTerm ? BROWN : LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.78rem", color: TEXT, outline: "none", boxSizing: "border-box" }}
          onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
          onBlur={e  => (e.currentTarget.style.borderColor = searchTerm ? BROWN : LINE)}
        />
      </div>

      {/* Trier par */}
      <FilterSection title="Trier par" isOpen={openSections.tri} onToggle={() => toggleSection("tri")}>
        {([["nom-asc","Nom A–Z"],["nom-desc","Nom Z–A"],["annee-asc","Année croissante"],["annee-desc","Année décroissante"]] as [string,string][]).map(([v, l]) => (
          <RadioOpt key={v} label={l} checked={`${sortField}-${sortDirection}` === v}
            onChange={() => { const [f, d] = v.split("-"); setSortField(f); setSortDirection(d as "asc"|"desc") }} />
        ))}
      </FilterSection>

      {/* Catégorie */}
      <FilterSection title="Catégorie" isOpen={openSections.categorie} onToggle={() => toggleSection("categorie")}>
        <RadioOpt label="Toutes" checked={!selectedCategorie} onChange={() => { setSelectedCategorie(""); setCurrentPage(1); setDisplayOffset(50) }} />
        {filterOptions.categories.map(cat => (
          <RadioOpt key={cat} label={cat} checked={selectedCategorie === cat} onChange={() => { setSelectedCategorie(cat); setCurrentPage(1); setDisplayOffset(50) }} />
        ))}
      </FilterSection>

      {/* Période */}
      <FilterSection title="Période" isOpen={openSections.periode} onToggle={() => toggleSection("periode")}>
        <div style={{ position: "relative", height: 28, margin: "0.3rem 0 0.8rem", padding: "0 2px" }}>
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 8, right: 8, height: 2, background: LINE, borderRadius: 1 }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: 2, background: BROWN, borderRadius: 1, pointerEvents: "none", left: `calc(8px + ${((yearRange[0]-yearBounds.min)/rangeWidth)*100}% * (100% - 16px) / 100%)`, right: `calc(8px + ${(1-((yearRange[1]-yearBounds.min)/rangeWidth))*100}% * (100% - 16px) / 100%)` }} />
          <input type="range" min={yearBounds.min} max={yearBounds.max} value={yearRange[0]}
            onChange={handleMinChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            className="lum-slider" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: 2, margin: 0, background: "transparent", appearance: "none", WebkitAppearance: "none", pointerEvents: "none", zIndex: 2, left: 0 }} />
          <input type="range" min={yearBounds.min} max={yearBounds.max} value={yearRange[1]}
            onChange={handleMaxChange} onMouseUp={handleSliderRelease} onTouchEnd={handleSliderRelease}
            className="lum-slider" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", height: 2, margin: 0, background: "transparent", appearance: "none", WebkitAppearance: "none", pointerEvents: "none", zIndex: 4, left: 0 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="text" value={yearMinInput}
            onChange={e => setYearMinInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderColor = LINE; handleMinBlur() }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
            style={{ flex: 1, minWidth: 0, padding: "0.38rem 0.3rem", border: `1px solid ${LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.75rem", color: TEXT, outline: "none", textAlign: "center" }}
          />
          <span style={{ fontFamily: "Georgia,serif", color: MUTED, fontSize: "0.8rem", flexShrink: 0 }}>—</span>
          <input type="text" value={yearMaxInput}
            onChange={e => setYearMaxInput(e.target.value)}
            onBlur={e => { e.currentTarget.style.borderColor = LINE; handleMaxBlur() }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
            style={{ flex: 1, minWidth: 0, padding: "0.38rem 0.3rem", border: `1px solid ${LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.75rem", color: TEXT, outline: "none", textAlign: "center" }}
          />
          {sliderModified && (
            <button onClick={() => { setYearRange([yearBounds.min, yearBounds.max]); setSliderModified(false) }}
              style={{ padding: "0.3rem", background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", flexShrink: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </FilterSection>

      {/* Créateur */}
      <FilterSection title="Créateur" isOpen={openSections.createur} onToggle={() => toggleSection("createur")}>
        <SearchableList
          search={creatorSearch} onSearch={setCreatorSearch} placeholder="Rechercher un créateur…"
          options={filterOptions.createurs} value={selectedCreateur}
          onChange={v => { setSelectedCreateur(v); setDisplayOffset(50) }} allLabel="Tous"
        />
      </FilterSection>

      {/* Matériaux */}
      {filterOptions.materiaux.length > 0 && (
        <FilterSection title="Matériaux" isOpen={openSections.materiaux} onToggle={() => toggleSection("materiaux")}>
          <SearchableList
            search={materiauxSearch} onSearch={setMateriauxSearch} placeholder="Rechercher un matériau…"
            options={filterOptions.materiaux} value={selectedMateriau}
            onChange={v => { setSelectedMateriau(v); setCurrentPage(1); setDisplayOffset(50) }} allLabel="Tous"
          />
        </FilterSection>
      )}

      {/* Couleur */}
      {filterOptions.couleurs.length > 0 && (
        <FilterSection title="Couleur" isOpen={openSections.couleur} onToggle={() => toggleSection("couleur")}>
          <RadioOpt label="Toutes" checked={!selectedCouleur} onChange={() => { setSelectedCouleur(""); setDisplayOffset(50) }} />
          {filterOptions.couleurs.slice(0, 15).map(c => (
            <RadioOpt key={c} label={c} checked={selectedCouleur === c} onChange={() => { setSelectedCouleur(c); setDisplayOffset(50) }} />
          ))}
        </FilterSection>
      )}

      {/* Dimensions */}
      <FilterSection title="Dimensions" isOpen={openSections.dimensions} onToggle={() => toggleSection("dimensions")}>
        <DimRange label="Hauteur" minVal={dimHauteurMin} maxVal={dimHauteurMax} onMin={v => { setDimHauteurMin(v); setDisplayOffset(50) }} onMax={v => { setDimHauteurMax(v); setDisplayOffset(50) }} />
        <DimRange label="Largeur" minVal={dimLargeurMin} maxVal={dimLargeurMax} onMin={v => { setDimLargeurMin(v); setDisplayOffset(50) }} onMax={v => { setDimLargeurMax(v); setDisplayOffset(50) }} />
        <DimRange label="Profondeur" minVal={dimProfondeurMin} maxVal={dimProfondeurMax} onMin={v => { setDimProfondeurMin(v); setDisplayOffset(50) }} onMax={v => { setDimProfondeurMax(v); setDisplayOffset(50) }} />
      </FilterSection>

      {/* Estimation */}
      <FilterSection title="Estimation" isOpen={openSections.estimation} onToggle={() => toggleSection("estimation")}>
        {EST_RANGES.map(({ label, value }) => (
          <RadioOpt key={value} label={label} checked={selectedEstimation === value && !estimationMin && !estimationMax}
            onChange={() => { setSelectedEstimation(value); setEstimationMin(""); setEstimationMax(""); setDisplayOffset(50) }} />
        ))}
        <div style={{ marginTop: "0.6rem", paddingTop: "0.6rem", borderTop: `1px solid ${LINE}` }}>
          <p style={{ fontFamily: "Georgia,serif", fontSize: "0.67rem", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, margin: "0 0 0.4rem", fontWeight: 600 }}>Montant personnalisé</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <input type="number" value={estimationMin} onChange={e => { setEstimationMin(e.target.value); setSelectedEstimation(""); setDisplayOffset(50) }} placeholder="min €"
              style={{ flex: 1, minWidth: 0, padding: "0.35rem 0.4rem", border: `1px solid ${estimationMin ? BROWN : LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.74rem", color: TEXT, outline: "none", textAlign: "center" }}
              onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
              onBlur={e  => (e.currentTarget.style.borderColor = estimationMin ? BROWN : LINE)}
            />
            <span style={{ fontFamily: "Georgia,serif", color: MUTED, fontSize: "0.75rem", flexShrink: 0 }}>–</span>
            <input type="number" value={estimationMax} onChange={e => { setEstimationMax(e.target.value); setSelectedEstimation(""); setDisplayOffset(50) }} placeholder="max €"
              style={{ flex: 1, minWidth: 0, padding: "0.35rem 0.4rem", border: `1px solid ${estimationMax ? BROWN : LINE}`, borderRadius: "3px", background: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif", fontSize: "0.74rem", color: TEXT, outline: "none", textAlign: "center" }}
              onFocus={e => (e.currentTarget.style.borderColor = BROWN)}
              onBlur={e  => (e.currentTarget.style.borderColor = estimationMax ? BROWN : LINE)}
            />
          </div>
        </div>
      </FilterSection>

      {/* Éditeur */}
      {filterOptions.editeurs.length > 0 && (
        <FilterSection title="Éditeur" isOpen={openSections.editeur} onToggle={() => toggleSection("editeur")}>
          <SearchableList
            search={editeurSearch} onSearch={setEditeurSearch} placeholder="Rechercher un éditeur…"
            options={filterOptions.editeurs} value={selectedEditeur}
            onChange={v => { setSelectedEditeur(v); setDisplayOffset(50) }} allLabel="Tous"
          />
        </FilterSection>
      )}

      {hasFilters && (
        <div style={{ padding: "0.9rem 1.2rem" }}>
          <button onClick={resetAllFilters} style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.74rem", color: BROWN, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Effacer tous les filtres
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen pb-20" style={{ background: CREAM }}>
      <style jsx global>{`
        .lum-slider { pointer-events: none !important; }
        .lum-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
          background: ${BROWN}; cursor: pointer; pointer-events: auto !important; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .lum-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%; background: ${BROWN}; cursor: pointer;
          pointer-events: auto !important; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .lum-card { transition: box-shadow 0.2s, transform 0.18s; }
        .lum-card:hover { box-shadow: 0 5px 22px rgba(139,115,85,0.16); transform: translateY(-2px); }
        .lum-row { transition: box-shadow 0.2s; }
        .lum-row:hover { box-shadow: 0 3px 14px rgba(139,115,85,0.13); }
        .lum-fav { opacity: 0; transition: opacity 0.18s; }
        .lum-card:hover .lum-fav, .lum-row:hover .lum-fav, .lum-fav.is-fav { opacity: 1 !important; }
        .lum-cat-item { transition: opacity 0.18s; }
        .lum-cat-item:hover { opacity: 0.82; }
        .lum-sidebar::-webkit-scrollbar { display: none; }
        .lum-sidebar { scrollbar-width: none; -ms-overflow-style: none; }
        .lum-sidebar-wrap { transition: width 0.28s ease, min-width 0.28s ease; }
      `}</style>

      <div style={{ display: "flex", maxWidth: "1400px", margin: "0 auto", alignItems: "flex-start" }}>

        {/* Sidebar desktop */}
        <aside className="lum-sidebar-wrap hidden md:block" style={{
          width: sidebarCollapsed ? "0px" : "240px",
          minWidth: sidebarCollapsed ? "0px" : "240px",
          flexShrink: 0, position: "sticky", top: 0,
          maxHeight: "100vh", overflow: "hidden",
          borderRight: sidebarCollapsed ? "none" : `1px solid ${LINE}`,
          background: CREAM,
        }}>
          <div className="lum-sidebar" style={{ width: "240px", maxHeight: "100vh", overflowY: "auto", overflowX: "visible" }}>
            {SidebarInner}
          </div>
        </aside>

        {/* Sidebar mobile overlay */}
        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "min(300px,88vw)", background: CREAM, borderRight: `1px solid ${LINE}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.2rem", borderBottom: `1px solid ${LINE}` }}>
                <span style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "1rem", color: TEXT }}>Filtres</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><X size={18} /></button>
              </div>
              <div className="lum-sidebar" style={{ overflowY: "auto", maxHeight: "calc(100vh - 56px)" }}>{SidebarInner}</div>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <main style={{ flex: 1, minWidth: 0, padding: "0 1.5rem 2rem" }}>

          {/* Titre + catégories */}
          <div style={{ padding: "1.75rem 0 1.5rem", borderBottom: `1px solid ${LINE}`, marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.25rem" }}>
              <h1 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 500, color: TEXT, margin: 0, fontStyle: "italic" }}>Collection</h1>
              <span style={{ fontFamily: "Georgia,serif", fontSize: "0.82rem", color: MUTED, fontStyle: "italic" }}>{activeCount.toLocaleString()} luminaires</span>
            </div>
            <div style={{ display: "flex", gap: "clamp(0.75rem,2.5vw,2rem)", overflowX: "auto", paddingBottom: "0.2rem" }}>
              {CATEGORIES.map((cat, i) => {
                const src      = homepageImages[`homepage_luminaire_${i}`] || null
                const isActive = selectedCategorie === cat
                return (
                  <button key={cat} className="lum-cat-item"
                    onClick={() => { setSelectedCategorie(isActive ? "" : cat); setDisplayOffset(50) }}
                    style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center", outline: "none" }}>
                    <div style={{ width: "clamp(62px,6.5vw,92px)", aspectRatio: "1/1", overflow: "hidden", background: "#e8e0d0", marginBottom: "0.45rem", outline: isActive ? `2px solid ${BROWN}` : "2px solid transparent", outlineOffset: "2px", transition: "outline 0.18s" }}>
                      {src
                        ? <img src={src} alt={CAT_LABELS[i]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>🏮</div>
                      }
                    </div>
                    <p style={{ fontFamily: "Georgia,serif", fontSize: "0.63rem", letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? BROWN : MUTED, margin: 0, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{CAT_LABELS[i]}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Barre top */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              {/* Toggle filtres desktop */}
              <button className="hidden md:flex"
                onClick={() => setSidebarCollapsed(prev => !prev)}
                style={{ alignItems: "center", gap: "0.35rem", padding: "0.38rem 0.75rem", borderRadius: "50px", border: `1px solid ${LINE}`, background: "rgba(255,255,255,0.6)", fontSize: "0.76rem", color: TEXT, cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                {sidebarCollapsed ? <><PanelLeftOpen size={14} /><span>Filtres</span></> : <><PanelLeftClose size={14} /><span>Masquer</span></>}
              </button>
              {/* Filtres mobile */}
              <button className="md:hidden" onClick={() => setSidebarOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.38rem 0.85rem", borderRadius: "50px", border: `1px solid ${LINE}`, background: "rgba(255,255,255,0.6)", fontSize: "0.76rem", color: TEXT, cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                <SlidersHorizontal size={13} /> Filtres
              </button>
              {hasFilters && (
                <button onClick={resetAllFilters}
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "50px", background: BROWN, border: "none", fontSize: "0.7rem", color: "#fff", cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                  <X size={10} /> Effacer les filtres
                </button>
              )}
            </div>
            <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: "5px", overflow: "hidden" }}>
              {(["grid","list"] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
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
                <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontStyle: "italic", fontSize: "0.82rem", color: TEXT, margin: "0 0 0.12rem" }}>Accès limité — vous voyez 10% de la collection</p>
                <p style={{ fontFamily: "Georgia,serif", fontSize: "0.73rem", color: MUTED, margin: 0, fontStyle: "italic" }}>Passez à Premium pour accéder à l'intégralité</p>
              </div>
              <Link href="/pricing">
                <button style={{ padding: "0.36rem 1rem", borderRadius: "50px", border: `1px solid ${BROWN}`, background: "transparent", color: BROWN, fontSize: "0.76rem", cursor: "pointer", fontFamily: "Georgia,serif", fontStyle: "italic", whiteSpace: "nowrap" }}>Découvrir Premium →</button>
              </Link>
            </div>
          )}

          {/* Grille */}
          {viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(145px,1fr))", gap: "0.75rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok    = idx < freeUserLimit
                const isFav = favorites.includes(String(lum._id))
                const hi    = highlightedLuminaire === String(lum._id)
                const W     = ok ? Link : ("div" as any)
                return (
                  <W key={lum._id} data-item-id={String(lum._id)}
                    {...(ok ? { href: `/luminaires/${lum._id}` } : {})} style={{ textDecoration: "none" }}
                    onClick={() => { if (ok) { sessionStorage.setItem("restore_item_luminaires", String(lum._id)); sessionStorage.setItem("restore_from_luminaires", "true"); saveScrollPosition(); saveForRestoration() } }}>
                    <div className={`lum-card${!ok ? " grayscale opacity-50 cursor-not-allowed" : " cursor-pointer"}`}
                      style={{ background: "#fff", borderRadius: "3px", overflow: "hidden", border: `1px solid ${hi ? BROWN : LINE}`, outline: hi ? `2px solid ${BROWN}` : "none", position: "relative" }}>
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{ position: "absolute", top: 5, right: 5, zIndex: 5, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.72rem", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
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
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.77rem", fontWeight: 600, color: TEXT, margin: "0 0 0.15rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{lum["Nom luminaire"] || "Sans nom"}</h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.66rem", color: MUTED, fontStyle: "italic", margin: "0 0 0.1rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{lum["Artiste / Dates"]?.split(",")[0] || ""}</p>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.64rem", color: BROWN, margin: 0 }}>{lum["Année"] || lum.annee || lum.year || ""}</p>
                        {!ok && <p style={{ fontSize: "0.6rem", color: MUTED, fontStyle: "italic", margin: "0.2rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                    </div>
                  </W>
                )
              })}
            </div>
          )}

          {/* Liste */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {displayedLuminaires.map((lum, idx) => {
                const ok    = idx < freeUserLimit
                const isFav = favorites.includes(String(lum._id))
                const hi    = highlightedLuminaire === String(lum._id)
                const W     = ok ? Link : ("div" as any)
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
                        <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "0.84rem", fontWeight: 600, color: TEXT, margin: "0 0 0.15rem", lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{lum["Nom luminaire"] || "Sans nom"}</h3>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: "0.72rem", color: MUTED, fontStyle: "italic", margin: "0 0 0.12rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{lum["Artiste / Dates"]?.split(",")[0] || ""}</p>
                        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                          {(lum["Année"] || lum.annee || lum.year) && <span style={{ fontSize: "0.66rem", color: BROWN, fontFamily: "Georgia,serif" }}>{lum["Année"] || lum.annee || lum.year}</span>}
                          {(lum["Catégorie"] || lum.categorie) && <span style={{ fontSize: "0.66rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>{lum["Catégorie"] || lum.categorie}</span>}
                          {(lum["Matériaux"] || lum.materiaux) && <span style={{ fontSize: "0.66rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>{typeof lum["Matériaux"] === "string" ? lum["Matériaux"].split(",")[0].trim() : (Array.isArray(lum.materiaux) ? lum.materiaux[0] : lum.materiaux)}</span>}
                          {(lum.estimation || lum["Estimation"]) && <span style={{ fontSize: "0.66rem", color: GOLD, fontFamily: "Georgia,serif" }}>{lum.estimation || lum["Estimation"]}</span>}
                        </div>
                        {!ok && <p style={{ fontSize: "0.6rem", color: MUTED, fontStyle: "italic", margin: "0.15rem 0 0", fontFamily: "Georgia,serif" }}>Premium requis</p>}
                      </div>
                      {ok && (
                        <button className={`lum-fav${isFav ? " is-fav" : ""}`}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(String(lum._id)) }}
                          style={{ flexShrink: 0, marginRight: "0.65rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem" }}>
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      )}
                    </div>
                  </W>
                )
              })}
            </div>
          )}

          {((hasFilters && displayOffset < filteredLuminaires.length) || (loadingMore && !showFavorites && !hasFilters)) && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.5rem 1.2rem", background: "rgba(255,255,255,0.6)", borderRadius: "50px", border: `1px solid ${LINE}` }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: BROWN }} />
                <span style={{ fontSize: "0.78rem", color: MUTED, fontFamily: "Georgia,serif", fontStyle: "italic" }}>Chargement…</span>
              </div>
            </div>
          )}

          {displayedLuminaires.length === 0 && !loading && allLuminairesLoaded && (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <p style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: "1.1rem", fontStyle: "italic", color: TEXT, opacity: 0.45 }}>
                {showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}
              </p>
            </div>
          )}
        </main>
      </div>

      {isAdmin && (
        <Button onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 rounded-full w-14 h-14 shadow-lg text-white"
          style={{ backgroundColor: BROWN }}>
          <Plus className="w-6 h-6" />
        </Button>
      )}

      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />


    </div>
  )
}
