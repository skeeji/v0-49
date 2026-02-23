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
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the active card into view centered
  useEffect(() => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const cards = container.children
    if (!cards[activeIdx]) return
    const card = cards[activeIdx] as HTMLElement
    const scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }, [activeIdx])

  return (
    <div>
      {/* Horizontal scroll strip - all periods visible, selected one is large */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 items-end"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`
          .chrono-strip::-webkit-scrollbar { display: none; }
        `}</style>
        {periods.map((period, i) => {
          const isActive = i === activeIdx
          return (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-in-out ${
                isActive
                  ? "w-[340px] md:w-[420px] h-[280px] md:h-[340px] shadow-2xl"
                  : "w-[140px] md:w-[160px] h-[180px] md:h-[220px] opacity-70 hover:opacity-90 shadow-lg"
              }`}
            >
              {period.sample ? (
                <img
                  src={`/api/images/filename/${period.sample.filename}`}
                  alt={period.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
                    isActive ? "scale-100" : "scale-110"
                  }`}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-[#8b7355]/15" />
              )}
              <div className={`absolute inset-0 transition-colors duration-300 ${
                isActive
                  ? "bg-gradient-to-t from-black/60 via-black/15 to-transparent"
                  : "bg-black/40"
              }`} />

              {/* Years - top */}
              <div className="absolute top-3 left-3 z-10">
                <span className={`text-white/80 font-medium tracking-wider ${
                  isActive ? "text-xs md:text-sm" : "text-[9px] md:text-[10px]"
                }`}>{period.years}</span>
              </div>

              {/* Name + count - bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                <h3 className={`font-serif font-bold text-white leading-tight transition-all ${
                  isActive ? "text-xl md:text-2xl" : "text-xs md:text-sm"
                }`}>{period.name}</h3>
                {isActive && period.count > 0 && (
                  <span className="text-white/60 text-xs mt-1 block">{period.count} luminaire{period.count > 1 ? "s" : ""}</span>
                )}
              </div>

              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#8b7355] z-20" />
              )}
            </button>
          )
        })}
      </div>

      {/* Link to full chronologie */}
      <div className="flex justify-center mt-2">
        <Link href="/chronologie" className="text-sm text-[#8b7355] hover:underline font-medium">
          Voir la chronologie complete
        </Link>
      </div>
    </div>
  )
}
