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
    const element = document.getElementById(`designer-${letter}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      const targetIndex = filteredDesigners.findIndex(
        (d: any) => d.name.charAt(0).toUpperCase() === letter
      )
      if (targetIndex > -1) {
        const newPage = Math.ceil((targetIndex + 1) / ITEMS_PER_PAGE)
        setDisplayedDesigners(filteredDesigners.slice(0, newPage * ITEMS_PER_PAGE))
        setPage(newPage)
        setHasMore(newPage * ITEMS_PER_PAGE < filteredDesigners.length)
        setTimeout(() => {
          document.getElementById(`designer-${letter}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7a6654]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between pl-14 md:pl-20 pr-6 md:pr-10 pt-8 pb-5">
        <h1
          className="text-5xl md:text-6xl font-normal text-[#3d2b1f] leading-none"
          style={{ fontFamily: "Playfair Display, Georgia, serif" }}
        >
          Designers
        </h1>

        {/* Barre de recherche minimale */}
        <div className="flex items-center gap-2 border border-[#c8bfb0] px-3 py-2 bg-transparent mt-2">
          <Search className="w-3.5 h-3.5 text-[#7a6654] flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="RECHERCHER UN DESIGNER"
            className="bg-transparent text-[10px] tracking-[0.18em] uppercase placeholder:text-[#b0a090] text-[#3d2b1f] outline-none w-36 md:w-48"
            style={{ fontFamily: "Georgia, serif" }}
          />
        </div>
      </div>

      {/* Message accès limité — discret */}
      {(!user || (userData?.role !== "premium" && userData?.role !== "admin")) && (
        <div className="pl-14 md:pl-20 pr-6 pb-3">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#7a6654]" style={{ fontFamily: "Georgia, serif" }}>
            Accès limité ·{" "}
            <Link href="/pricing" className="underline underline-offset-2 hover:text-[#3d2b1f] transition-colors">
              Passer à Premium
            </Link>{" "}
            pour voir l'intégralité de la collection
          </p>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="flex">

        {/* Nav alphabet — desktop */}
        <nav
          className="hidden md:flex flex-col sticky top-[60px] h-[calc(100vh-60px)] w-10 pl-3 pt-3 flex-shrink-0 overflow-hidden"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {/* Label vertical "DÉJÀ A-Z" */}
          <span
            className="text-[8px] tracking-[0.22em] text-[#b0a090] uppercase mb-3 select-none leading-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            DÉJÀ A-Z
          </span>

          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter)
            const isActive = activeLetter === letter
            return (
              <button
                key={letter}
                onClick={() => isAvailable && scrollToLetter(letter)}
                disabled={!isAvailable}
                className="flex-1 text-left text-xs leading-none transition-colors"
                style={{
                  color: isActive ? "#3d2b1f" : isAvailable ? "#7a6654" : "#d8d0c0",
                  cursor: isAvailable ? "pointer" : "default",
                }}
              >
                {isActive ? `${letter}—` : letter}
              </button>
            )
          })}
        </nav>

        {/* Nav alphabet — mobile (fixée à gauche) */}
        <nav className="md:hidden fixed left-0 top-[60px] h-[calc(100vh-120px)] z-40 flex flex-col py-1 px-0.5 bg-[#f5f1e8]/95 backdrop-blur-sm border-r border-[#d8d0c0] overflow-hidden w-6">
          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter)
            const isActive = activeLetter === letter
            return (
              <button
                key={letter}
                onClick={() => isAvailable && scrollToLetter(letter)}
                disabled={!isAvailable}
                className="flex-1 flex items-center justify-center text-[9px] transition-colors"
                style={{
                  fontFamily: "Georgia, serif",
                  color: isActive ? "#3d2b1f" : isAvailable ? "#7a6654" : "#d8d0c0",
                }}
              >
                {letter}
              </button>
            )
          })}
        </nav>

        {/* ── Contenu designers ── */}
        <div className="flex-1 pl-4 md:pl-6 pr-0">

          {/* Ligne séparatrice du haut */}
          <div className="border-t border-[#d8d0c0] mr-6 md:mr-10" />

          {displayedDesigners.map((designer, index) => {
            const firstLetter = designer.name.charAt(0).toUpperCase()
            const isFirstOfLetter =
              index === 0 || displayedDesigners[index - 1]?.name.charAt(0).toUpperCase() !== firstLetter
            const isAccessible = !user || userData?.role === "free" ? index < freeUserLimit : true
            const luminairesMat = (lum: any) =>
              lum["Matériaux"] || lum["Matière"] || lum["Matières"] || lum.materiaux || lum.materials || ""

            return (
              <div
                key={index}
                id={isFirstOfLetter && ALPHABET.includes(firstLetter) ? `designer-${firstLetter}` : undefined}
                data-item-id={designer.slug}
                className="scroll-mt-20"
              >
                <div
                  className={`flex gap-0 py-8 md:py-10 border-b border-[#d8d0c0] mr-0 transition-opacity ${
                    highlightedDesigner === designer.slug ? "opacity-70" : ""
                  } ${!isAccessible ? "opacity-40" : ""}`}
                >

                  {/* ── Colonne portrait ── */}
                  <div
                    className="flex-shrink-0 w-[130px] md:w-[220px] pr-4 md:pr-8 cursor-pointer group"
                    onClick={() => {
                      if (!isAccessible) return
                      sessionStorage.setItem("restore_item_designers", designer.slug)
                      sessionStorage.setItem("restore_from_designers", "true")
                      saveScrollPosition()
                      saveForRestoration()
                      window.location.href = `/designers/${designer.slug}`
                    }}
                  >
                    {/* Image portrait */}
                    <div
                      className="relative overflow-hidden bg-[#e8e4dc]"
                      style={{ aspectRatio: "3/4" }}
                    >
                      {designer.image ? (
                        <Image
                          src={designer.image}
                          alt={designer.name}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-8 h-8 md:w-12 md:h-12 text-[#b0a090]" />
                        </div>
                      )}
                    </div>

                    {/* Nom du designer */}
                    <h2
                      className="text-xl md:text-4xl font-normal text-[#3d2b1f] mt-3 md:mt-4 leading-tight"
                      style={{ fontFamily: "Playfair Display, Georgia, serif" }}
                    >
                      {designer.name}
                    </h2>

                    {/* Dates */}
                    {designer.years.length > 0 && (
                      <p
                        className="text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-[#7a6654] mt-1"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {Math.min(...designer.years)} — {Math.max(...designer.years)}
                      </p>
                    )}
                  </div>

                  {/* ── Slider luminaires ── */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Piste défilante */}
                    <div
                      className="flex gap-3 md:gap-4 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {designer.luminaires.map((lum: any, idx: number) => (
                        <div key={idx} className="flex-shrink-0 w-[120px] md:w-[210px]">
                          {/* Image luminaire */}
                          <div
                            className="relative overflow-hidden bg-[#e8e4dc]"
                            style={{ aspectRatio: "3/4" }}
                          >
                            <Image
                              src={lum.image || "/placeholder.svg"}
                              alt={lum.name}
                              fill
                              unoptimized
                              className="object-cover"
                              onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                            />
                          </div>

                          {/* Nom du luminaire */}
                          <p
                            className="text-[8px] md:text-[10px] tracking-[0.16em] uppercase text-[#3d2b1f] mt-2 leading-tight"
                            style={{ fontFamily: "Georgia, serif" }}
                          >
                            {lum.name}
                          </p>

                          {/* Matériaux */}
                          {luminairesMat(lum) && (
                            <p
                              className="text-[7px] md:text-[9px] tracking-[0.12em] uppercase text-[#7a6654] mt-0.5 leading-tight"
                              style={{ fontFamily: "Georgia, serif" }}
                            >
                              {luminairesMat(lum)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Dégradé droit — indique qu'on peut slider */}
                    {designer.luminaires.length > 2 && (
                      <div
                        className="absolute right-0 top-0 pointer-events-none"
                        style={{
                          bottom: "1.5rem",
                          width: "80px",
                          background: "linear-gradient(to left, #f5f1e8 20%, transparent 100%)",
                        }}
                      />
                    )}
                  </div>

                </div>
              </div>
            )
          })}

          {/* Chargement infini */}
          {hasMore && (
            <div ref={ref} className="py-10 flex justify-center mr-6 md:mr-10">
              {isLoadingMore && <Loader2 className="w-5 h-5 animate-spin text-[#7a6654]" />}
            </div>
          )}
        </div>
      </div>

      <MobileFooter />
    </div>
  )
}
