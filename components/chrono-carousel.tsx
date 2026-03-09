"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
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
  const [activeIdx, setActiveIdx] = useState(0)
  const rafRef = useRef<number>(0)
  const isHoveringRef = useRef(false)
  const mouseXRef = useRef(0.5)
  const isJumpingRef = useRef(false)

  // Triple the periods for infinite scroll effect (clone before and after)
  const extendedPeriods = useMemo(() => {
    if (periods.length === 0) return []
    return [...periods, ...periods, ...periods]
  }, [periods])

  const originalLength = periods.length

  // Detect which card is closest to the center
  const detectCenter = useCallback(() => {
    const container = scrollRef.current
    if (!container || isJumpingRef.current) return
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

  // Handle infinite loop - jump to middle section when reaching edges
  const handleInfiniteLoop = useCallback(() => {
    const container = scrollRef.current
    if (!container || isJumpingRef.current || originalLength === 0) return

    const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
    if (cards.length === 0) return

    const firstMiddleCard = cards[originalLength]
    const lastMiddleCard = cards[originalLength * 2 - 1]
    
    if (!firstMiddleCard || !lastMiddleCard) return

    const scrollLeft = container.scrollLeft
    const containerWidth = container.offsetWidth

    // Check if we're in the first third (cloned beginning)
    if (scrollLeft < firstMiddleCard.offsetLeft - containerWidth / 2) {
      isJumpingRef.current = true
      // Jump to the corresponding position in the middle section
      const jumpOffset = originalLength * (cards[0]?.offsetWidth || 150 + 16)
      container.scrollLeft = scrollLeft + jumpOffset
      setTimeout(() => { isJumpingRef.current = false }, 50)
    }
    // Check if we're in the last third (cloned end)
    else if (scrollLeft > lastMiddleCard.offsetLeft - containerWidth / 2 + (lastMiddleCard.offsetWidth || 150)) {
      isJumpingRef.current = true
      // Jump to the corresponding position in the middle section
      const jumpOffset = originalLength * (cards[0]?.offsetWidth || 150 + 16)
      container.scrollLeft = scrollLeft - jumpOffset
      setTimeout(() => { isJumpingRef.current = false }, 50)
    }
  }, [originalLength])

  // Initial centering on the middle section
  useEffect(() => {
    const container = scrollRef.current
    if (!container || originalLength === 0) return

    const centerOnMiddle = () => {
      const cards = container.querySelectorAll<HTMLElement>("[data-chrono-card]")
      // Center on the middle of the middle section
      const middleSectionStart = originalLength
      const mid = middleSectionStart + Math.floor(originalLength / 2)
      if (cards[mid]) {
        const card = cards[mid]
        container.scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2
        setActiveIdx(mid)
      }
    }

    const t = setTimeout(centerOnMiddle, 100)
    return () => clearTimeout(t)
  }, [originalLength])

  // Scroll listener
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          detectCenter()
          handleInfiniteLoop()
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [detectCenter, handleInfiniteLoop])

  // Desktop: mouse hover auto-scroll with stable speed
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const isTouchDevice = "ontouchstart" in window
    if (isTouchDevice) return

    const onMouseEnter = () => { isHoveringRef.current = true }
    const onMouseLeave = () => { 
      isHoveringRef.current = false
      mouseXRef.current = 0.5 // Reset to center
    }
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseXRef.current = (e.clientX - rect.left) / rect.width
    }

    let lastTime = 0
    const animate = (currentTime: number) => {
      // Use delta time for consistent speed regardless of frame rate
      const deltaTime = lastTime ? (currentTime - lastTime) / 16.67 : 1
      lastTime = currentTime

      if (isHoveringRef.current && container && !isJumpingRef.current) {
        const x = mouseXRef.current
        // Faster scroll speed with wider active zones
        if (x < 0.35) {
          const speed = (0.35 - x) * 18 * deltaTime
          container.scrollLeft -= speed
        } else if (x > 0.65) {
          const speed = (x - 0.65) * 18 * deltaTime
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

  // Get the actual period index (0 to originalLength-1) for display
  const getOriginalIndex = (idx: number) => {
    if (originalLength === 0) return 0
    return idx % originalLength
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto py-4 md:py-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {/* Spacer for centering */}
        <div className="flex-shrink-0 w-[30vw] sm:w-[35vw] md:w-[40vw]" />
        {extendedPeriods.map((period, i) => {
          const isActive = i === activeIdx
          const originalIdx = getOriginalIndex(i)
          return (
            <Link
              key={`${period.name}-${i}`}
              href="/chronologie"
              data-chrono-card
              data-original-idx={originalIdx}
              className={`flex-shrink-0 relative overflow-hidden block ${
                isActive
                  ? "w-[140px] h-[160px] sm:w-[170px] sm:h-[190px] md:w-[200px] md:h-[230px] rounded-2xl ring-2 ring-[#c9a96e]/70 shadow-2xl z-10"
                  : "w-[95px] h-[110px] sm:w-[115px] sm:h-[135px] md:w-[135px] md:h-[155px] rounded-xl opacity-80"
              }`}
              style={{ transition: "width 300ms ease-out, height 300ms ease-out, opacity 300ms ease-out, box-shadow 300ms ease-out" }}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-[#d5cbb8]" />

              {/* Image */}
              {period.sample ? (
                <img
                  src={`/api/images/filename/${period.sample.filename}`}
                  alt={period.name}
                  className={`absolute inset-0 w-full h-full object-cover ${
                    isActive ? "opacity-100" : "opacity-50 grayscale-[50%]"
                  }`}
                  style={{ transition: "opacity 300ms ease-out, filter 300ms ease-out" }}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#8b7355]/30 text-3xl font-serif">{period.name.charAt(0)}</span>
                </div>
              )}

              {/* Overlay */}
              <div 
                className={`absolute inset-0 ${
                  isActive
                    ? "bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                    : "bg-gradient-to-t from-black/50 via-black/5 to-transparent"
                }`}
                style={{ transition: "background 300ms ease-out" }}
              />

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
        {/* Spacer for centering */}
        <div className="flex-shrink-0 w-[30vw] sm:w-[35vw] md:w-[40vw]" />
      </div>
    </div>
  )
}
