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

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // Center on the middle card initially
    const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
    const mid = Math.floor(periods.length / 2)
    if (cards[mid]) {
      const card = cards[mid]
      container.scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
    }

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
  }, [periods.length, detectCenter])

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto py-6 px-8 md:px-16 scroll-smooth"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
    >
      <style>{`.chrono-scroll::-webkit-scrollbar { display: none; }`}</style>
      {periods.map((period, i) => {
        const isActive = i === activeIdx
        return (
          <Link
            key={period.name}
            href="/chronologie"
            data-chrono-card
            className={`flex-shrink-0 relative overflow-hidden transition-all duration-500 ease-in-out block ${
              isActive
                ? "w-[150px] h-[170px] sm:w-[180px] sm:h-[200px] md:w-[220px] md:h-[240px] rounded-2xl ring-2 ring-[#8b7355]/60 shadow-2xl z-10"
                : "w-[100px] h-[120px] sm:w-[120px] sm:h-[140px] md:w-[140px] md:h-[160px] rounded-xl"
            }`}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-[#e8e0d0]" />

            {/* Image */}
            {period.sample ? (
              <img
                src={`/api/images/filename/${period.sample.filename}`}
                alt={period.name}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                  isActive ? "scale-100 opacity-100" : "scale-95 opacity-50 grayscale-[40%]"
                }`}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#8b7355]/30 text-3xl font-serif">{period.name.charAt(0)}</span>
              </div>
            )}

            {/* Overlay gradient */}
            <div className={`absolute inset-0 transition-all duration-500 ${
              isActive
                ? "bg-gradient-to-t from-black/60 via-transparent to-transparent"
                : "bg-gradient-to-t from-black/50 via-black/10 to-transparent"
            }`} />

            {/* Period name */}
            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10 text-center">
              <span
                className={`font-serif font-bold leading-tight drop-shadow-lg transition-all duration-300 block ${
                  isActive
                    ? "text-white text-xs sm:text-sm md:text-base"
                    : "text-white/80 text-[10px] sm:text-xs md:text-sm"
                }`}
              >
                {period.name}
              </span>
              {isActive && (
                <span className="text-white/60 text-[9px] sm:text-[10px] md:text-xs mt-0.5 block font-sans">
                  {period.years}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
