"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface LuminaireFrame {
  _id: string
  imageUrl: string
  nom?: string
}

const FRAME_SPACING = 600
const BATCH_SIZE = 20

interface CorridorGalleryProps {
  videoUrl?: string
}

export function CorridorGallery({ videoUrl }: CorridorGalleryProps) {
  const router = useRouter()
  
  // Refs for animation (no re-renders)
  const cameraZ = useRef(0)
  const targetCameraZ = useRef(0)
  const isFetching = useRef(false)
  const framesRef = useRef<LuminaireFrame[]>([])
  const sceneRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number>(0)
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null)
  const mouseY = useRef(0)
  const pageRef = useRef(1)
  const maxZ = useRef(0)
  
  // Touch handling refs
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchCurrentX = useRef(0)
  const isTouching = useRef(false)
  const isHorizontalSwipe = useRef(false)
  
  // State for UI
  const [frames, setFrames] = useState<LuminaireFrame[]>([])
  const [autoPlay, setAutoPlay] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Fetch luminaires
  const fetchLuminaires = useCallback(async () => {
    if (isFetching.current) return
    isFetching.current = true

    try {
      const response = await fetch(`/api/luminaires?page=${pageRef.current}&limit=${BATCH_SIZE}`)
      const data = await response.json()

      if (data.success && data.luminaires.length > 0) {
        const newFrames: LuminaireFrame[] = data.luminaires
          .filter((l: any) => l.filename)
          .map((l: any) => ({
            _id: l._id,
            imageUrl: `/api/images/filename/${l.filename}`,
            nom: l.nom || l["Nom luminaire"] || ""
          }))

        framesRef.current = [...framesRef.current, ...newFrames]
        maxZ.current = framesRef.current.length * FRAME_SPACING
        pageRef.current += 1
        setFrames([...framesRef.current])
      }
    } catch (error) {
      console.error("Error fetching luminaires for corridor:", error)
    } finally {
      isFetching.current = false
    }
  }, [])

  // Animation loop - works for both desktop and mobile
  const animate = useCallback(() => {
    // Smooth interpolation towards target
    const diff = targetCameraZ.current - cameraZ.current
    cameraZ.current += diff * 0.1

    if (sceneRef.current) {
      sceneRef.current.style.transform = `translateZ(${cameraZ.current}px)`
    }

    // Check if we need to load more frames
    if (cameraZ.current > maxZ.current - 3000 && !isFetching.current) {
      fetchLuminaires()
    }

    rafId.current = requestAnimationFrame(animate)
  }, [fetchLuminaires])

  // Wheel handler (desktop only)
  const onWheel = useCallback((e: WheelEvent) => {
    if (isMobile) return

    const screenHeight = window.innerHeight
    const bottomZone = screenHeight * 0.75

    // If mouse is in bottom 25%, allow native scroll
    if (mouseY.current > bottomZone) {
      setShowScrollHint(false)
      return
    }

    // Otherwise, hijack scroll for camera movement
    e.preventDefault()
    targetCameraZ.current = Math.max(0, targetCameraZ.current + e.deltaY * 0.8)
  }, [isMobile])

  // Mouse move handler (desktop only)
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile) return
    mouseY.current = e.clientY
    const screenHeight = window.innerHeight
    const bottomZone = screenHeight * 0.75
    setShowScrollHint(mouseY.current > bottomZone)
  }, [isMobile])

  // Touch handlers for mobile swipe (horizontal only)
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchCurrentX.current = e.touches[0].clientX
    isTouching.current = true
    isHorizontalSwipe.current = false // Reset direction detection
  }, [isMobile])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isMobile || !isTouching.current) return
    
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    
    // Detect swipe direction on first significant movement
    if (!isHorizontalSwipe.current) {
      const deltaX = Math.abs(currentX - touchStartX.current)
      const deltaY = Math.abs(currentY - touchStartY.current)
      
      // Need at least 10px movement to determine direction
      if (deltaX > 10 || deltaY > 10) {
        isHorizontalSwipe.current = deltaX > deltaY
      }
      
      // If vertical scroll, don't interfere
      if (!isHorizontalSwipe.current) {
        return
      }
    }
    
    // Only prevent default and handle gallery navigation for horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault()
      
      const deltaX = touchCurrentX.current - currentX
      touchCurrentX.current = currentX
      
      // Swipe left (finger moves left) = deltaX positive = advance (increase Z)
      // Swipe right (finger moves right) = deltaX negative = go back (decrease Z)
      targetCameraZ.current = Math.max(0, targetCameraZ.current + deltaX * 3)
    }
  }, [isMobile])

  const onTouchEnd = useCallback(() => {
    isTouching.current = false
    isHorizontalSwipe.current = false
  }, [])

  // Keyboard handler
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      targetCameraZ.current = Math.max(0, targetCameraZ.current + 200)
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      targetCameraZ.current = Math.max(0, targetCameraZ.current - 200)
    }
  }, [])

  // Auto-play toggle
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => {
      if (!prev) {
        autoPlayInterval.current = setInterval(() => {
          targetCameraZ.current += 2
        }, 16)
      } else {
        if (autoPlayInterval.current) {
          clearInterval(autoPlayInterval.current)
          autoPlayInterval.current = null
        }
      }
      return !prev
    })
  }, [])

  // Setup and cleanup
  useEffect(() => {
    // Initial fetch
    fetchLuminaires()

    // Start animation loop
    rafId.current = requestAnimationFrame(animate)

    const gallery = galleryRef.current

    // Desktop: wheel and mouse events
    if (gallery) {
      gallery.addEventListener("wheel", onWheel, { passive: false })
    }
    window.addEventListener("mousemove", onMouseMove)

    // Mobile: touch events
    if (gallery) {
      gallery.addEventListener("touchstart", onTouchStart, { passive: true })
      gallery.addEventListener("touchmove", onTouchMove, { passive: false })
      gallery.addEventListener("touchend", onTouchEnd, { passive: true })
    }
    
    window.addEventListener("keydown", onKeyDown)

    return () => {
      cancelAnimationFrame(rafId.current)
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current)
      }
      if (gallery) {
        gallery.removeEventListener("wheel", onWheel)
        gallery.removeEventListener("touchstart", onTouchStart)
        gallery.removeEventListener("touchmove", onTouchMove)
        gallery.removeEventListener("touchend", onTouchEnd)
      }
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [animate, fetchLuminaires, onWheel, onMouseMove, onKeyDown, onTouchStart, onTouchMove, onTouchEnd])

  const handleFrameClick = (id: string) => {
    router.push(`/luminaires/${id}`)
  }

  // Responsive values
  const frameWidth = isMobile ? 180 : 260
  const frameHeight = isMobile ? 220 : 300
  const xOffset = isMobile ? 220 : 580
  const borderWidth = isMobile ? 4 : 6

  return (
    <div
      ref={galleryRef}
      className="relative w-full h-screen overflow-hidden"
      style={{
        perspective: isMobile ? "800px" : "1200px",
        perspectiveOrigin: "50% 50%"
      }}
    >
      {/* Video background */}
      {videoUrl && (
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay for corridor atmosphere */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(26,20,8,0.7) 0%, rgba(10,10,10,0.85) 70%)"
        }}
      />

      {/* Corridor atmosphere - left wall */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-16 md:w-32 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(20,16,10,0.9) 0%, transparent 100%)"
        }}
      />
      
      {/* Corridor atmosphere - right wall */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-16 md:w-32 pointer-events-none"
        style={{
          background: "linear-gradient(to left, rgba(20,16,10,0.9) 0%, transparent 100%)"
        }}
      />

      {/* Floor line */}
      <div 
        className="absolute left-0 right-0 top-1/2 h-px pointer-events-none"
        style={{
          background: "rgba(139,115,85,0.15)"
        }}
      />

      {/* Vanishing point glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-96 h-48 md:h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,200,80,0.08) 0%, transparent 70%)"
        }}
      />

      {/* 3D Scene */}
      <div
        ref={sceneRef}
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: "translateZ(0px)"
        }}
      >
        {frames.map((frame, index) => {
          const isLeft = index % 2 === 0
          const xPos = isLeft ? -xOffset : xOffset
          const rotateY = isLeft ? 12 : -12

          return (
            <div
              key={frame._id}
              onClick={() => handleFrameClick(frame._id)}
              className="absolute cursor-pointer group"
              style={{
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
                left: "50%",
                top: "50%",
                marginLeft: `${-frameWidth / 2}px`,
                marginTop: `${-frameHeight / 2}px`,
                transform: `translateX(${xPos}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg)`,
                border: `${borderWidth}px solid #8B7355`,
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.8), 0 0 24px rgba(139,115,85,0.3)",
                transition: "box-shadow 0.3s ease, transform 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.boxShadow = "inset 0 0 12px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,80,0.6)"
                  e.currentTarget.style.transform = `translateX(${xPos}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg) scale(1.04)`
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.boxShadow = "inset 0 0 12px rgba(0,0,0,0.8), 0 0 24px rgba(139,115,85,0.3)"
                  e.currentTarget.style.transform = `translateX(${xPos}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg)`
                }
              }}
            >
              <img
                src={frame.imageUrl}
                alt={frame.nom || `Luminaire ${index + 1}`}
                className="w-full h-full object-cover"
                style={{
                  filter: "sepia(0.2) contrast(1.05)"
                }}
                loading="lazy"
              />
            </div>
          )
        })}
      </div>

      {/* Auto-play button */}
      <button
        onClick={toggleAutoPlay}
        className="absolute bottom-6 right-6 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(4px)"
        }}
      >
        {autoPlay ? "STOP" : "AUTO"}
      </button>

      {/* Scroll/Swipe hint */}
      {isMobile ? (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 text-white/60">
            <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs">Glissez pour explorer</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ) : showScrollHint && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex flex-col items-center text-white/60">
            <span className="text-xs mb-1">Scroll vers le bas</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Title overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none">
        <h2 className="text-xl md:text-3xl font-serif text-[#d4c4a0] drop-shadow-lg">
          Luminaires du Moyen-âge à nos jours
        </h2>
        <p className="text-xs md:text-sm text-[#a89878] mt-1">
          {isMobile ? "Glissez pour explorer" : "Scrollez pour explorer"}
        </p>
      </div>
    </div>
  )
}
