"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Users, Search } from "lucide-react"
import { MobileFooter } from "@/components/MobileFooter"
import { useScrollRestoration, useMarkScrollRestoration } from "@/hooks/useScrollRestoration"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState([])
  const [filteredDesigners, setFilteredDesigners] = useState([])
  const [displayedDesigners, setDisplayedDesigners] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const { user, userData } = useAuth()
  const pathname = usePathname()
  const [filterMode, setFilterMode] = useState<"period" | "az">("period")
  const [periodFilter, setPeriodFilter] = useState("")
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [highlightedDesigner, setHighlightedDesigner] = useState<string | null>(null)
  const [pendingHighlightSlug, setPendingHighlightSlug] = useState<string | null>(null)
  const restorationDoneRef = useRef(false)
  const yearFilter = ["modern", "contemporary", "art-deco"] // Declare yearFilter variable

  // Scroll restoration
  const { saveScrollPosition } = useScrollRestoration("designers-page", displayedDesigners.length)
  const { saveForRestoration } = useMarkScrollRestoration()

  // Retour arrière — lecture sessionStorage au montage
  useEffect(() => {
    const shouldRestore = sessionStorage.getItem("restore_from_designers")
    if (shouldRestore !== "true") return
    const slug = sessionStorage.getItem("restore_item_designers")
    sessionStorage.removeItem("restore_from_designers")
    sessionStorage.removeItem("restore_item_designers")
    if (slug) setPendingHighlightSlug(slug)
  }, [])

  // Surbrillance — déclenché quand les données sont chargées
  useEffect(() => {
    if (!pendingHighlightSlug || displayedDesigners.length === 0 || restorationDoneRef.current) return
    const el = document.querySelector(`[data-item-id="${pendingHighlightSlug}"]`)
    if (el) {
      restorationDoneRef.current = true
      const delay = window.innerWidth < 768 ? 400 : 100
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setHighlightedDesigner(pendingHighlightSlug)
        setPendingHighlightSlug(null)
        setTimeout(() => setHighlightedDesigner(null), 1500)
      }, delay)
    }
  }, [displayedDesigners, pendingHighlightSlug])

  // Compute available letters from all filtered designers (not just displayed batch)
  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    filteredDesigners.forEach((designer: any) => {
      const firstLetter = designer.name.charAt(0).toUpperCase()
      if (ALPHABET.includes(firstLetter)) {
        letters.add(firstLetter)
      }
    })
    return letters
  }, [filteredDesigners])

  // Track active letter based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150 // Offset for header
      
      // Find which letter section is currently visible
      for (const letter of ALPHABET) {
        const element = document.getElementById(`designer-${letter}`)
        if (element) {
          const rect = element.getBoundingClientRect()
          const elementTop = rect.top + window.scrollY
          const elementBottom = elementTop + rect.height
          
          if (scrollPosition >= elementTop && scrollPosition < elementBottom + 200) {
            setActiveLetter(letter)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [displayedDesigners])

  // Scroll to letter section — charge les batches manquants si nécessaire
  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter)

    // Si la section est déjà dans le DOM → scroll direct, pas de rechargement
    const element = document.getElementById(`designer-${letter}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    const targetIndex = filteredDesigners.findIndex(
      (d: any) => d.name.charAt(0).toUpperCase() === letter
    )
    if (targetIndex === -1) return

    // Jump rapide : on aligne sur la page qui CONTIENT la lettre cible
    // → on ne rend pas tous les designers depuis A (évite le lag sur Z, Y…)
    const targetPage  = Math.floor(targetIndex / ITEMS_PER_PAGE)
    const pageStart   = targetPage * ITEMS_PER_PAGE
    setDisplayedDesigners(filteredDesigners.slice(pageStart, pageStart + ITEMS_PER_PAGE))
    setPage(targetPage + 1)
    setHasMore((targetPage + 1) * ITEMS_PER_PAGE < filteredDesigners.length)
    window.scrollTo({ top: 0 })
    setTimeout(() => {
      document.getElementById(`designer-${letter}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Calculer la limite pour les comptes gratuits
  const freeUserLimit =
    !user || userData?.role === "free" ? Math.ceil(filteredDesigners.length * 0.1) : filteredDesigners.length

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Charger tous les luminaires pour extraire TOUS les designers
        const luminairesResponse = await fetch("/api/luminaires-light")
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          console.log(`👨‍🎨 Extraction des designers depuis ${luminairesData.luminaires.length} luminaires`)

          // Grouper les luminaires par designer et récupérer l'image du designer
          const designerGroups = luminairesData.luminaires.reduce((acc: any, luminaire: any) => {
            const designerName = luminaire["Artiste / Dates"] || luminaire.designer || "Designer inconnu"

            if (!acc[designerName]) {
              acc[designerName] = {
                name: designerName,
                count: 0,
                luminaires: [],
                image: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : "",
                slug: encodeURIComponent(designerName),
                years: [],
              }
            }

            acc[designerName].count++

            if (luminaire.designerImageFilename && !acc[designerName].image) {
              acc[designerName].image = `/api/images/filename/${luminaire.designerImageFilename}`
              console.log(`🖼️ Image designer trouvée pour ${designerName}: ${luminaire.designerImageFilename}`)
            }

            // Construction de l'URL de l'image du luminaire
            let luminaireImageUrl = "/placeholder.svg"
            if (luminaire.imageId) {
              luminaireImageUrl = `/api/images/${luminaire.imageId}`
              console.log(`🖼️ Image luminaire via imageId pour ${designerName}: ${luminaire.imageId}`)
            } else if (luminaire.filename) {
              luminaireImageUrl = `/api/images/filename/${luminaire.filename}`
              console.log(`🖼️ Image luminaire via filename pour ${designerName}: ${luminaire.filename}`)
            } else if (luminaire["Nom du fichier"]) {
              luminaireImageUrl = `/api/images/filename/${luminaire["Nom du fichier"]}`
              console.log(`🖼️ Image luminaire via Nom du fichier pour ${designerName}: ${luminaire["Nom du fichier"]}`)
            }

            acc[designerName].luminaires.push({
              ...luminaire,
              image: luminaireImageUrl,
              name: luminaire["Nom luminaire"] || luminaire.nom || "Sans nom",
            })

            // Extraire les années du champ "Artiste / Dates"
            const artistDates = luminaire["Artiste / Dates"] || luminaire.designer || ""
            const yearMatches = artistDates.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)
            if (yearMatches) {
              acc[designerName].years = [
                ...new Set([...acc[designerName].years, ...yearMatches.map((y) => Number.parseInt(y))]),
              ]
            }

            return acc
          }, {})

          console.log(`👨‍🎨 ${Object.keys(designerGroups).length} designers uniques trouvés`)

          // Essayer aussi l'ancienne méthode en fallback
          try {
            const designersResponse = await fetch("/api/designers-list")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              console.log(`🖼️ ${designersResult.designers.length} images de designers disponibles (fallback)`)

              // Associer les images aux designers qui n'en ont pas encore
              Object.keys(designerGroups).forEach((designerName) => {
                if (!designerGroups[designerName].image) {
                  const designerInfo = designersResult.designers.find(
                    (d: any) => d.Nom && d.Nom.toLowerCase().trim() === designerName.toLowerCase().trim(),
                  )

                  if (designerInfo && designerInfo.imagedesigner) {
                    designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`
                    console.log(`🖼️ Image fallback trouvée pour ${designerName}: ${designerInfo.imagedesigner}`)
                  }
                }
              })
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers fallback:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          console.log(`✅ ${designersArray.length} designers finaux`)

          // Stocker TOUS les designers
          setAllDesigners(designersArray)
          setFilteredDesigners(designersArray)
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtrer et trier
  useEffect(() => {
    let filtered = [...allDesigners]

    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (periodFilter) {
      filtered = filtered.filter((designer) => designer.years.some((year) => yearFilter.includes(year)))
    }

    // Supprimer les doublons
    const uniqueDesigners = filtered.filter(
      (designer, index, self) => index === self.findIndex((d) => d.name === designer.name),
    )

    uniqueDesigners.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "year-asc":
          const minYearA = a.years.length > 0 ? Math.min(...a.years) : 9999
          const minYearB = b.years.length > 0 ? Math.min(...b.years) : 9999
          return minYearA - minYearB
        case "year-desc":
          const maxYearA = a.years.length > 0 ? Math.max(...a.years) : 0
          const maxYearB = b.years.length > 0 ? Math.max(...b.years) : 0
          return maxYearB - maxYearA
        default:
          return 0
      }
    })

    setFilteredDesigners(uniqueDesigners)
    setPage(0)
    setHasMore(true)
    setDisplayedDesigners([])
  }, [allDesigners, searchTerm, sortBy, periodFilter])

  // Charger plus d'éléments - maintenant charge TOUS les designers
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = filteredDesigners.slice(startIndex, endIndex)

      if (page === 0) {
        setDisplayedDesigners(newItems)
      } else {
        setDisplayedDesigners((prev) => [...prev, ...newItems])
      }

      setPage((prev) => prev + 1)
      setHasMore(endIndex < filteredDesigners.length)
      setIsLoadingMore(false)
    }, 300)
  }, [page, filteredDesigners, isLoadingMore, hasMore])

  const loadMoreRef = useRef(loadMore)
  useEffect(() => { loadMoreRef.current = loadMore }, [loadMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMoreRef.current()
    }
  }, [inView, isLoadingMore, hasMore])

  // Charger la première page
  useEffect(() => {
    if (filteredDesigners.length > 0 && displayedDesigners.length === 0) {
      loadMore()
    }
  }, [filteredDesigners, displayedDesigners.length, loadMore])

  // ── constantes design (cohérentes avec le reste du site) ──────────────────
  const CREAM = "#f5f1e8"
  const TEXT  = "#3d2b1f"
  const MUTED = "#7a6654"
  const LINE  = "#d8d0c0"
  const SERIF = '"Playfair Display", Georgia, serif'
  const SANS  = "Georgia, serif"

  // Extrait le nom pur sans les dates entre parenthèses ou après virgule
  // ex: "Agence Humbert & Poyet (2007 - )" → "Agence Humbert & Poyet"
  // ex: "Anonyme (? - ?)" → "Anonyme" / "Studio ( - )" → "Studio"
  const cleanName = (raw: string) =>
    raw.replace(/\s*\(\s*[\d\?\s\-–]*[-–][\s\S]*$/, "").trim() || raw

  // Affiche les années : plage ou année unique ouverte "2007 —"
  const yearsLabel = (years: number[]) => {
    if (!years.length) return null
    const min = Math.min(...years)
    const max = Math.max(...years)
    return min === max ? `${min} —` : `${min} — ${max}`
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 26, height: 26, color: MUTED }} className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, paddingBottom: 80 }}>

      {/* ── En-tête ── */}
      <div className="pl-6 md:pl-[52px]" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingRight: 28, paddingTop: 36, paddingBottom: 18 }}>
        <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: TEXT, margin: 0 }}>
          Designers
        </h1>

        {/* Recherche — discrète, fond identique à la page */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${LINE}`, padding: "7px 14px", background: CREAM }}>
          <Search size={13} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un designer…"
            style={{ background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontStyle: "italic", fontSize: "0.78rem", color: TEXT, width: 220 }}
          />
        </div>
      </div>

      {/* Accès limité — une ligne discrète */}
      {(!user || (userData?.role !== "premium" && userData?.role !== "admin")) && (
        <div className="pl-6 md:pl-[52px]" style={{ paddingRight: 28, paddingBottom: 10 }}>
          <p style={{ fontFamily: SANS, fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, margin: 0 }}>
            Accès limité ·{" "}
            <Link href="/pricing" style={{ textDecoration: "underline", textUnderlineOffset: 2, color: "inherit" }}>
              Passer à Premium
            </Link>
          </p>
        </div>
      )}

      {/* ── Layout ── */}
      <div style={{ display: "flex" }}>

        {/* Nav alphabet desktop */}
        <nav
          className="hidden md:flex"
          style={{ flexDirection: "column", position: "sticky", top: 60, height: "calc(100vh - 60px)", width: 40, flexShrink: 0, paddingLeft: 10, paddingTop: 14, overflow: "hidden" }}
        >
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: SANS, fontSize: "0.45rem", letterSpacing: "0.22em", color: "#b8ad9e", textTransform: "uppercase", marginBottom: 10, lineHeight: 1, userSelect: "none" }}>
            DÉJÀ A-Z
          </span>
          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter)
            const isActive    = activeLetter === letter
            return (
              <button key={letter} onClick={() => isAvailable && scrollToLetter(letter)} disabled={!isAvailable}
                style={{ flex: 1, background: "none", border: "none", padding: 0, textAlign: "left", fontFamily: SANS, fontSize: "0.65rem", lineHeight: 1, cursor: isAvailable ? "pointer" : "default", color: isActive ? TEXT : isAvailable ? MUTED : LINE, transition: "color 0.15s" }}>
                {isActive ? `${letter}—` : letter}
              </button>
            )
          })}
        </nav>

        {/* Nav alphabet mobile */}
        <nav className="md:hidden" style={{ position: "fixed", left: 0, top: 60, height: "calc(100vh - 120px)", zIndex: 40, display: "flex", flexDirection: "column", padding: "4px 1px", background: "rgba(245,241,232,0.96)", backdropFilter: "blur(4px)", borderRight: `1px solid ${LINE}`, overflow: "hidden", width: 18 }}>
          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter)
            const isActive    = activeLetter === letter
            return (
              <button key={letter} onClick={() => isAvailable && scrollToLetter(letter)} disabled={!isAvailable}
                style={{ flex: 1, background: "none", border: "none", padding: 0, fontFamily: SANS, fontSize: "0.48rem", cursor: isAvailable ? "pointer" : "default", color: isActive ? TEXT : isAvailable ? MUTED : LINE }}>
                {letter}
              </button>
            )
          })}
        </nav>

        {/* ── Contenu designers ── */}
        {/* pl-6 mobile = dépasse le nav fixé de 18px / md:pl-0 car le nav est dans le flux desktop */}
        <div className="pl-6 md:pl-0" style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
          <div style={{ borderTop: `1px solid ${LINE}` }} />

          {displayedDesigners.map((designer, index) => {
            const firstLetter     = designer.name.charAt(0).toUpperCase()
            const isFirstOfLetter = index === 0 || displayedDesigners[index - 1]?.name.charAt(0).toUpperCase() !== firstLetter
            const isAccessible    = !user || userData?.role === "free" ? index < freeUserLimit : true
            const getLumMat  = (lum: any) => lum["Matériaux"] || lum["Matière"] || lum["Matières"] || lum.materiaux || lum.materials || ""
            const getLumYear = (lum: any) => lum.annee || lum["Année"] || ""

            return (
              <div
                key={index}
                id={isFirstOfLetter && ALPHABET.includes(firstLetter) ? `designer-${firstLetter}` : undefined}
                data-item-id={designer.slug}
                style={{ borderBottom: `1px solid ${LINE}`, scrollMarginTop: 80, opacity: !isAccessible ? 0.38 : highlightedDesigner === designer.slug ? 0.65 : 1, transition: "opacity 0.35s" }}
              >
                <div style={{ display: "flex", gap: 14, padding: "36px 0", alignItems: "flex-start" }}>

                  {/* ── Portrait ── */}
                  <div
                    className="w-[130px] md:w-[230px] flex-shrink-0 group"
                    style={{ cursor: isAccessible ? "pointer" : "not-allowed" }}
                    onClick={() => {
                      if (!isAccessible) return
                      sessionStorage.setItem("restore_item_designers", designer.slug)
                      sessionStorage.setItem("restore_from_designers", "true")
                      saveScrollPosition()
                      saveForRestoration()
                      window.location.href = `/designers/${designer.slug}`
                    }}
                  >
                    {/* Image portrait — ratio 3:4, contain = image entière sans recadrage */}
                    <div className="relative overflow-hidden w-full" style={{ aspectRatio: "3 / 4", background: CREAM }}>
                      {designer.image
                        ? <Image src={designer.image} alt={designer.name} fill unoptimized style={{ objectFit: "contain", transition: "transform 0.5s ease" }} className="group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} />
                        : <div style={{ width: "100%", height: "100%", background: "#e5e0d6", display: "flex", alignItems: "center", justifyContent: "center" }}><Users style={{ width: 22, height: 22, color: "#b8ad9e" }} /></div>
                      }
                    </div>
                    {/* Nom — police identique aux noms de la page luminaires */}
                    <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(0.82rem, 1.2vw, 1.15rem)", color: TEXT, marginTop: 10, marginBottom: 0, lineHeight: 1.22 }}>
                      {cleanName(designer.name)}
                    </h2>
                    {/* Dates sur une seconde ligne */}
                    {yearsLabel(designer.years) && (
                      <p style={{ fontFamily: SANS, fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginTop: 4, marginBottom: 0 }}>
                        {yearsLabel(designer.years)}
                      </p>
                    )}
                  </div>


                  {/* ── Slider luminaires ── plus petits que le portrait
                      overflow: clip  = clip visuel sans bloquer le scroll enfant
                      min-width: 0    = autorise le flex-item à rétrécir sous son contenu  */}
                  <div style={{ flex: 1, minWidth: 0, position: "relative", overflow: "clip" }}>

                    {/* Piste défilante : touch / trackpad / drag souris
                        paddingTop centre les images luminaires au milieu de l'image portrait :
                        mobile  (130×4/3=173px portrait, 108px lum) → (173-108)/2 = 32px
                        desktop (230×4/3=307px portrait, 185px lum) → (307-185)/2 = 61px  */}
                    <div
                      className="lum-scroll pt-8 md:pt-[61px]"
                      style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 2, cursor: "grab" } as React.CSSProperties}
                      onMouseDown={(e) => {
                        const el      = e.currentTarget
                        const startX  = e.pageX - el.offsetLeft
                        const scrollL = el.scrollLeft
                        let dragging  = false
                        const onMove  = (mv: MouseEvent) => {
                          const delta = mv.pageX - el.offsetLeft - startX
                          if (!dragging && Math.abs(delta) > 5) { dragging = true; el.style.cursor = "grabbing" }
                          if (dragging) { mv.preventDefault(); el.scrollLeft = scrollL - delta }
                        }
                        const onUp    = () => { el.style.cursor = "grab"; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
                        document.addEventListener("mousemove", onMove)
                        document.addEventListener("mouseup", onUp)
                      }}
                      onMouseMove={(e) => {
                        if ((e.buttons & 1) !== 0) return
                        const el = e.currentTarget
                        const { left, width } = el.getBoundingClientRect()
                        const x = e.clientX - left
                        if (x > width - 90) {
                          el.scrollLeft += ((x - (width - 90)) / 90) * 7
                        }
                      }}
                    >
                      {designer.luminaires.map((lum: any, idx: number) => {
                        const lumId = lum._id || lum.id
                        return (
                          /* Luminaires — carré 1:1 comme la page luminaires, contenu entier visible */
                          <Link
                            key={idx}
                            href={lumId ? `/luminaires/${lumId}` : "#"}
                            className="w-[108px] md:w-[185px] flex-shrink-0 block group"
                            style={{ textDecoration: "none" }}
                          >
                            {/* Carré 1:1, cover → cadre toujours identique (même taille visuelle pour tous) */}
                            <div className="relative overflow-hidden w-full" style={{ aspectRatio: "1 / 1", background: CREAM, border: `1px solid ${LINE}` }}>
                              <Image src={lum.image || "/placeholder.svg"} alt={lum.name} fill unoptimized style={{ objectFit: "cover", transition: "transform 0.5s ease" }} className="group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} />
                            </div>
                            <p style={{ fontFamily: SANS, fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT, marginTop: 7, marginBottom: 0, lineHeight: 1.4 }}>
                              {lum.name}{getLumYear(lum) ? ` — ${getLumYear(lum)}` : ""}
                            </p>
                            {getLumMat(lum) && (
                              <p style={{ fontFamily: SANS, fontSize: "0.47rem", letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginTop: 2, marginBottom: 0, lineHeight: 1.4 }}>
                                {getLumMat(lum)}
                              </p>
                            )}
                          </Link>
                        )
                      })}
                    </div>

                    {/* Dégradé droit : la carte partiellement visible invite à glisser */}
                    <div style={{ position: "absolute", right: 0, top: 0, bottom: "0.4rem", width: 60, background: `linear-gradient(to left, ${CREAM} 30%, transparent 100%)`, pointerEvents: "none" }} />
                  </div>

                </div>
              </div>
            )
          })}

          {hasMore && (
            <div ref={ref} style={{ padding: "2.5rem 0", display: "flex", justifyContent: "center" }}>
              {isLoadingMore && <Loader2 style={{ width: 18, height: 18, color: MUTED }} className="animate-spin" />}
            </div>
          )}
        </div>
      </div>

      <MobileFooter />
    </div>
  )
}
