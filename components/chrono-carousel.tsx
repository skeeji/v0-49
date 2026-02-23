"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import Link from "next/link"

interface Period {
  name: string
  years: string
  start: number
  end: number
  sample: any
  count: number
}

export function ChronoCarousel({
  periods,
  homepageImages = {},
}: {
  periods: Period[]
  homepageImages?: Record<string, string>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(-1)
  const lastActiveRef = useRef(-1)
  const rafRef = useRef<number>(0)
  const isHoveringRef = useRef(false)
  const mouseXRef = useRef(0.5)

  // Detect which card is closest to the center - debounced via ref comparison
  const detectCenter = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const centerX = container.scrollLeft + container.offsetWidth / 2
    let closest = 0
    let minDist = Infinity
    const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(centerX - cardCenter)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    // Only update if it actually changed - prevents re-render loops
    if (closest !== lastActiveRef.current) {
      lastActiveRef.current = closest
      setActiveIdx(closest)
    }
  }, [])

  // Initial centering
  useEffect(() => {
    const container = scrollRef.current
    if (!container || periods.length === 0) return

    const centerOnCard = () => {
      const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
      const mid = Math.floor(periods.length / 2)
      if (cards[mid]) {
        const card = cards[mid]
        container.scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
      }
      lastActiveRef.current = mid
      setActiveIdx(mid)
    }

    const t = setTimeout(centerOnCard, 150)
    return () => clearTimeout(t)
  }, [periods.length])

  // Scroll listener with throttle
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          detectCenter()
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [detectCenter])

  // Desktop: mouse hover auto-scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const isTouchDevice = "ontouchstart" in window
    if (isTouchDevice) return

    const onMouseEnter = () => { isHoveringRef.current = true }
    const onMouseLeave = () => { isHoveringRef.current = false }
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseXRef.current = (e.clientX - rect.left) / rect.width
    }

    const animate = () => {
      if (isHoveringRef.current && container) {
        const x = mouseXRef.current
        if (x < 0.3) {
          const speed = (0.3 - x) * 4
          container.scrollLeft -= speed
        } else if (x > 0.7) {
          const speed = (x - 0.7) * 4
          container.scrollLeft += speed
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    container.addEventListener("mouseenter", onMouseEnter)
    container.addEventListener("mouseleave", onMouseLeave)
    container.addEventListener("mousemove", onMouseMove)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      container.removeEventListener("mouseenter", onMouseEnter)
      container.removeEventListener("mouseleave", onMouseLeave)
      container.removeEventListener("mousemove", onMouseMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // All cards have the SAME base size - zoom is done purely via CSS transform: scale()
  // This prevents layout shifts that cause the vibration feedback loop
  const CARD_W = "w-[110px] sm:w-[130px] md:w-[150px]"
  const CARD_H = "h-[130px] sm:h-[155px] md:h-[175px]"

  return (
    <div className="relative overflow-hidden">
      <div
        ref={scrollRef}
        className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-x-auto py-8 md:py-10"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {/* Spacer so the first card can reach center */}
        <div className="flex-shrink-0 w-[30vw] sm:w-[35vw] md:w-[40vw]" />
        {periods.map((period, i) => {
          const isActive = i === activeIdx
          const overrideKey = `homepage_chronologie_${i}`
          const overrideSrc = homepageImages[overrideKey]
          const imgSrc = overrideSrc || (period.sample ? `/api/images/filename/${period.sample.filename}` : "")
          return (
            <Link
              key={period.name}
              href="/chronologie"
              data-chrono-card
              className={`flex-shrink-0 ${CARD_W} ${CARD_H} relative overflow-hidden rounded-xl block will-change-transform transition-transform duration-500 ease-out ${
                isActive
                  ? "scale-[1.3] z-10 shadow-2xl ring-2 ring-[#c9a96e]/60 rounded-2xl"
                  : "scale-100 opacity-75"
              }`}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-[#d5cbb8]" />

              {/* Image */}
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={period.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                    isActive ? "opacity-100" : "opacity-50 grayscale-[50%]"
                  }`}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#8b7355]/30 text-3xl font-serif">{period.name.charAt(0)}</span>
                </div>
              )}

              {/* Overlay */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                isActive
                  ? "bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                  : "bg-gradient-to-t from-black/50 via-black/5 to-transparent"
              }`} />

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5 md:p-3 z-10 text-center">
                <span
                  className={`font-serif font-bold leading-tight drop-shadow-lg block transition-all duration-500 ${
                    isActive
                      ? "text-[#f5e6c8] text-[10px] sm:text-xs md:text-sm"
                      : "text-[#e8dcc8]/90 text-[9px] sm:text-[10px] md:text-xs"
                  }`}
                >
                  {period.name}
                </span>
                {isActive && (
                  <span className="text-[#c9a96e] text-[8px] sm:text-[9px] md:text-[10px] mt-0.5 block font-medium tracking-wide">
                    {period.years}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
        {/* Spacer so the last card can reach center */}
        <div className="flex-shrink-0 w-[30vw] sm:w-[35vw] md:w-[40vw]" />
      </div>
    </div>
  )
}
