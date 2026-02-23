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
  const rafRef = useRef<number>(0)
  const isHoveringRef = useRef(false)
  const mouseXRef = useRef(0.5)
  const lastActiveRef = useRef(-1)

  // Detect center card - debounced via ref comparison
  const detectCenter = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const centerX = container.scrollLeft + container.offsetWidth / 2
    let closest = 0
    let minDist = Infinity
    const cards = container.querySelectorAll<HTMLElement>("[data-idx]")
    cards.forEach((card) => {
      const idx = parseInt(card.dataset.idx || "0")
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(centerX - cardCenter)
      if (dist < minDist) {
        minDist = dist
        closest = idx
      }
    })
    // Only update if changed to prevent re-render loops
    if (closest !== lastActiveRef.current) {
      lastActiveRef.current = closest
      setActiveIdx(closest)
    }
  }, [])

  // Initial centering on mount
  useEffect(() => {
    const container = scrollRef.current
    if (!container || periods.length === 0) return

    const centerOnMiddle = () => {
      const cards = container.querySelectorAll<HTMLElement>("[data-idx]")
      const mid = Math.floor(periods.length / 2)
      if (cards[mid]) {
        const card = cards[mid]
        container.scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
      }
      lastActiveRef.current = mid
      setActiveIdx(mid)
    }

    const t = setTimeout(centerOnMiddle, 150)
    return () => clearTimeout(t)
  }, [periods.length])

  // Scroll listener with throttle
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let timeout: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(detectCenter, 60)
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
      clearTimeout(timeout)
    }
  }, [detectCenter])

  // Desktop mouse hover auto-scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    if ("ontouchstart" in window) return

    const onEnter = () => { isHoveringRef.current = true }
    const onLeave = () => { isHoveringRef.current = false }
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseXRef.current = (e.clientX - rect.left) / rect.width
    }

    const animate = () => {
      if (isHoveringRef.current && container) {
        const x = mouseXRef.current
        if (x < 0.25) {
          container.scrollLeft -= (0.25 - x) * 4
        } else if (x > 0.75) {
          container.scrollLeft += (x - 0.75) * 4
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    container.addEventListener("mouseenter", onEnter)
    container.addEventListener("mouseleave", onLeave)
    container.addEventListener("mousemove", onMove)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      container.removeEventListener("mouseenter", onEnter)
      container.removeEventListener("mouseleave", onLeave)
      container.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // All cards same base size - use transform scale for zoom (no reflow!)
  const CARD_W = "w-[120px] sm:w-[130px] md:w-[150px]"
  const CARD_H = "h-[140px] sm:h-[150px] md:h-[175px]"

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-3 md:gap-4 overflow-x-auto py-8 md:py-10"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex-shrink-0 w-[35vw] sm:w-[38vw] md:w-[42vw]" />
        {periods.map((period, i) => {
          const isActive = i === activeIdx
          const overrideKey = `homepage_chronologie_${i}`
          const imgSrc = homepageImages[overrideKey] || (period.sample ? `/api/images/filename/${period.sample.filename}` : "")
          return (
            <Link
              key={period.name}
              href="/chronologie"
              data-idx={i}
              className={`flex-shrink-0 ${CARD_W} ${CARD_H} relative overflow-hidden rounded-xl block will-change-transform`}
              style={{
                transform: isActive ? "scale(1.35)" : "scale(1)",
                opacity: isActive ? 1 : 0.7,
                transition: "transform 0.4s ease, opacity 0.4s ease",
                zIndex: isActive ? 10 : 1,
                filter: isActive ? "none" : "grayscale(40%)",
                boxShadow: isActive ? "0 8px 30px rgba(0,0,0,0.3)" : "none",
                borderRadius: "12px",
              }}
            >
              <div className="absolute inset-0 bg-[#d5cbb8]" />

              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={period.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#8b7355]/30 text-3xl font-serif">{period.name.charAt(0)}</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10 text-center">
                <span className={`font-serif font-bold drop-shadow-lg block ${
                  isActive ? "text-[#f5e6c8] text-xs md:text-sm" : "text-white/90 text-[10px] md:text-xs"
                }`}>
                  {period.name}
                </span>
                {isActive && (
                  <span className="text-[#c9a96e] text-[9px] md:text-[11px] mt-0.5 block font-medium tracking-wide">
                    {period.years}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
        <div className="flex-shrink-0 w-[35vw] sm:w-[38vw] md:w-[42vw]" />
      </div>
    </div>
  )
}
