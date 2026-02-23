"use client"

import { useState, useRef, useEffect } from "react"
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

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const cards = container.children
      if (cards[activeIdx]) {
        const card = cards[activeIdx] as HTMLElement
        const scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: "smooth" })
      }
    }
  }, [activeIdx])

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-3 md:gap-4 overflow-x-auto py-4 px-4"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
    >
      <style>{`
        .chrono-slider-row::-webkit-scrollbar { display: none; }
      `}</style>
      {periods.map((period, i) => {
        const isActive = i === activeIdx
        return (
          <button
            key={period.name}
            onClick={() => setActiveIdx(i)}
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
