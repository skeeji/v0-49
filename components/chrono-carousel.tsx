"use client"

import { useState } from "react"
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
  const active = periods[activeIdx]

  return (
    <div className="space-y-6">
      {/* Image principale - premier plan */}
      <Link href="/chronologie">
        <div className="relative aspect-[16/7] md:aspect-[16/6] rounded-2xl overflow-hidden group cursor-pointer mx-auto max-w-4xl">
          {active?.sample ? (
            <img
              src={`/api/images/filename/${active.sample.filename}`}
              alt={active.sample.nom || active.name}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-[#8b7355]/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
          <div className="absolute top-4 left-5 z-10">
            <span className="text-white/70 text-xs md:text-sm font-medium tracking-wider">{active?.years}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 z-10">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white leading-tight">{active?.name}</h3>
            {active?.count > 0 && (
              <span className="text-white/60 text-xs md:text-sm mt-1 block">{active.count} luminaire{active.count > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Bande scrollable de vignettes */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`.chrono-thumbs::-webkit-scrollbar { display: none; }`}</style>
        {periods.map((period, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all duration-300 ${
              i === activeIdx
                ? "w-28 h-20 md:w-36 md:h-24 ring-2 ring-[#8b7355] opacity-100"
                : "w-24 h-16 md:w-28 md:h-20 opacity-60 hover:opacity-90"
            }`}
          >
            {period.sample ? (
              <img
                src={`/api/images/filename/${period.sample.filename}`}
                alt={period.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-[#8b7355]/15" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-white text-[10px] md:text-xs font-serif font-bold text-center leading-tight px-1 drop-shadow">
                {period.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
