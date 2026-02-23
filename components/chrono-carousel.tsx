"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  const [activeIdx, setActiveIdx] = useState(Math.floor(periods.length / 2))
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrolling = useRef(false)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  // Scroll to active card on click
  const scrollToCard = useCallback((idx: number) => {
    if (scrollRef.current) {
      isUserScrolling.current = false
      const container = scrollRef.current
      const cards = container.children
      if (cards[idx]) {
        const card = cards[idx] as HTMLElement
        const scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: "smooth" })
      }
    }
  }, [])

  // Initial scroll to center
  useEffect(() => {
    scrollToCard(activeIdx)
  }, [])

  // Detect scroll and update active card based on center position
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      isUserScrolling.current = true

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      scrollTimeout.current = setTimeout(() => {
        if (!container) return
        const containerCenter = container.scrollLeft + container.offsetWidth / 2
        let closestIdx = 0
        let closestDist = Infinity

        Array.from(container.children).forEach((child, idx) => {
          const el = child as HTMLElement
          const cardCenter = el.offsetLeft + el.offsetWidth / 2
          const dist = Math.abs(containerCenter - cardCenter)
          if (dist < closestDist) {
            closestDist = dist
            closestIdx = idx
          }
        })

        if (closestIdx !== activeIdx) {
          setActiveIdx(closestIdx)
        }
        isUserScrolling.current = false
      }, 100)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [activeIdx])

  const handleClick = (idx: number) => {
    setActiveIdx(idx)
    scrollToCard(idx)
  }

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-3 md:gap-4 overflow-x-auto py-4 px-4"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
    >
      {periods.map((period, i) => {
        const isActive = i === activeIdx
        return (
          <button
            key={period.name}
            onClick={() => handleClick(i)}
            className={`flex-shrink-0 relative overflow-hidden transition-all duration-500 ease-in-out cursor-pointer ${
              isActive
                ? "w-[180px] h-[200px] md:w-[220px] md:h-[240px] rounded-2xl ring-2 ring-[#8b7355]/60 shadow-2xl z-10"
                : "w-[120px] h-[140px] md:w-[140px] md:h-[160px] rounded-xl opacity-80 hover:opacity-100"
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
                  isActive ? "scale-100 opacity-100" : "scale-90 opacity-60 grayscale-[30%]"
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
                : "bg-gradient-to-t from-black/40 via-transparent to-transparent"
            }`} />

            {/* Period name */}
            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10 text-center">
              <span
                className={`font-serif font-bold leading-tight drop-shadow-lg transition-all duration-300 ${
                  isActive
                    ? "text-white text-sm md:text-base"
                    : "text-white text-xs md:text-sm"
                }`}
              >
                {period.name}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
