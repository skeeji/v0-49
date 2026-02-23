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

export function ChronoCarousel({ periods }: { periods: Period[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(Math.floor(periods.length / 2))
  const rafRef = useRef<number>(0)
  const isHoveringRef = useRef(false)
  const mouseXRef = useRef(0.5)

  // Detect which card is closest to the center
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
    setActiveIdx(closest)
  }, [])

  // Initial centering
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const centerOnCard = () => {
      const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
      const mid = Math.floor(periods.length / 2)
      if (cards[mid]) {
        const card = cards[mid]
        container.scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
      }
    }

    // Run centering after a short delay to ensure layout is done
    const t = setTimeout(centerOnCard, 100)
    return () => clearTimeout(t)
  }, [periods.length])

  // Scroll listener
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

  // Desktop: mouse hover auto-scroll (move left/right based on mouse position)
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // Only on non-touch devices
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
        // Dead zone in the center (40%-60%) - no scroll
        if (x < 0.3) {
          const speed = (0.3 - x) * 5
          container.scrollLeft -= speed
        } else if (x > 0.7) {
          const speed = (x - 0.7) * 5
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

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto py-4 md:py-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {/* Spacer so the first card can reach center */}
        <div className="flex-shrink-0 w-[30vw] sm:w-[35vw] md:w-[40vw]" />
        {periods.map((period, i) => {
          const isActive = i === activeIdx
          return (
            <Link
              key={period.name}
              href="/chronologie"
              data-chrono-card
              className={`flex-shrink-0 relative overflow-hidden transition-all duration-300 ease-out block ${
                isActive
                  ? "w-[140px] h-[160px] sm:w-[170px] sm:h-[190px] md:w-[200px] md:h-[230px] rounded-2xl ring-2 ring-[#c9a96e]/70 shadow-2xl z-10"
                  : "w-[95px] h-[110px] sm:w-[115px] sm:h-[135px] md:w-[135px] md:h-[155px] rounded-xl opacity-80"
              }`}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-[#d5cbb8]" />

              {/* Image */}
              {period.sample ? (
                <img
                  src={`/api/images/filename/${period.sample.filename}`}
                  alt={period.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                    isActive ? "scale-100 opacity-100" : "scale-95 opacity-50 grayscale-[50%]"
                  }`}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#8b7355]/30 text-3xl font-serif">{period.name.charAt(0)}</span>
                </div>
              )}

              {/* Overlay */}
              <div className={`absolute inset-0 transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                  : "bg-gradient-to-t from-black/50 via-black/5 to-transparent"
              }`} />

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-3 z-10 text-center">
                <span
                  className={`font-serif font-bold leading-tight drop-shadow-lg block ${
                    isActive
                      ? "text-[#f5e6c8] text-[11px] sm:text-xs md:text-sm"
                      : "text-[#e8dcc8]/90 text-[9px] sm:text-[10px] md:text-xs"
                  }`}
                >
                  {period.name}
                </span>
                {isActive && (
                  <span className="text-[#c9a96e] text-[8px] sm:text-[9px] md:text-[11px] mt-0.5 block font-medium tracking-wide">
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
