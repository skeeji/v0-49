"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  const isFetching = useRef(false)
  const framesRef = useRef<LuminaireFrame[]>([])
  const sceneRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number>(0)
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null)
  const mouseY = useRef(0)
  const pageRef = useRef(1)
  const maxZ = useRef(0)
  const mobileSliderRef = useRef<HTMLDivElement>(null)
  
  // State for UI
  const [frames, setFrames] = useState<LuminaireFrame[]>([])
  const [autoPlay, setAutoPlay] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileIndex, setMobileIndex] = useState(0)

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

  // Animation loop (desktop only)
  const animate = useCallback(() => {
    if (isMobile) return

    if (sceneRef.current) {
      sceneRef.current.style.transform = `translateZ(${cameraZ.current}px)`
    }

    // Check if we need to load more frames
    if (cameraZ.current > maxZ.current - 3000 && !isFetching.current) {
      fetchLuminaires()
    }

    rafId.current = requestAnimationFrame(animate)
  }, [fetchLuminaires, isMobile])

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
    cameraZ.current = Math.max(0, cameraZ.current + e.deltaY * 0.8)
  }, [isMobile])

  // Mouse move handler (desktop only)
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile) return
    mouseY.current = e.clientY
    const screenHeight = window.innerHeight
    const bottomZone = screenHeight * 0.75
    setShowScrollHint(mouseY.current > bottomZone)
  }, [isMobile])

  // Keyboard handler
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (isMobile) {
      if (e.key === "ArrowRight") {
        setMobileIndex(prev => Math.min(prev + 1, frames.length - 1))
      } else if (e.key === "ArrowLeft") {
        setMobileIndex(prev => Math.max(prev - 1, 0))
      }
    } else {
      if (e.key === "ArrowDown") {
        cameraZ.current = Math.max(0, cameraZ.current + 40)
      } else if (e.key === "ArrowUp") {
        cameraZ.current = Math.max(0, cameraZ.current - 40)
      }
    }
  }, [isMobile, frames.length])

  // Auto-play toggle (desktop only)
  const toggleAutoPlay = useCallback(() => {
    if (isMobile) return
    
    setAutoPlay(prev => {
      if (!prev) {
        autoPlayInterval.current = setInterval(() => {
          cameraZ.current += 2
        }, 16)
      } else {
        if (autoPlayInterval.current) {
          clearInterval(autoPlayInterval.current)
          autoPlayInterval.current = null
        }
      }
      return !prev
    })
  }, [isMobile])

  // Mobile slider navigation
  const slidePrev = useCallback(() => {
    setMobileIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const slideNext = useCallback(() => {
    if (mobileIndex >= frames.length - 3 && !isFetching.current) {
      fetchLuminaires()
    }
    setMobileIndex(prev => Math.min(prev + 1, frames.length - 1))
  }, [frames.length, mobileIndex, fetchLuminaires])

  // Touch handlers for mobile swipe
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        slideNext()
      } else {
        slidePrev()
      }
    }
  }, [slideNext, slidePrev])

  // Setup and cleanup
  useEffect(() => {
    // Initial fetch
    fetchLuminaires()

    if (!isMobile) {
      // Start animation loop
      rafId.current = requestAnimationFrame(animate)

      // Event listeners
      const gallery = galleryRef.current
      if (gallery) {
        gallery.addEventListener("wheel", onWheel, { passive: false })
      }
      window.addEventListener("mousemove", onMouseMove)
    }
    
    window.addEventListener("keydown", onKeyDown)

    return () => {
      cancelAnimationFrame(rafId.current)
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current)
      }
      const gallery = galleryRef.current
      if (gallery) {
        gallery.removeEventListener("wheel", onWheel)
      }
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [animate, fetchLuminaires, onWheel, onMouseMove, onKeyDown, isMobile])

  const handleFrameClick = (id: string) => {
    router.push(`/luminaires/${id}`)
  }

  // Mobile version - horizontal slider
  if (isMobile) {
    return (
      <div className="relative w-full h-[70vh] overflow-hidden">
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

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />

        {/* Title */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none">
          <h2 className="text-xl font-serif text-[#d4c4a0] drop-shadow-lg">
            Galerie Immersive
          </h2>
          <p className="text-xs text-[#a89878] mt-1">
            Glissez pour explorer
          </p>
        </div>

        {/* Slider container */}
        <div 
          ref={mobileSliderRef}
          className="absolute inset-0 flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Cards container */}
          <div 
            className="flex items-center gap-4 transition-transform duration-300 ease-out px-8"
            style={{
              transform: `translateX(calc(50% - ${mobileIndex * 220 + 100}px))`
            }}
          >
            {frames.map((frame, index) => {
              const isActive = index === mobileIndex
              const distance = Math.abs(index - mobileIndex)
              const scale = isActive ? 1 : Math.max(0.7, 1 - distance * 0.15)
              const opacity = Math.max(0.3, 1 - distance * 0.3)

              return (
                <div
                  key={frame._id}
                  onClick={() => handleFrameClick(frame._id)}
                  className="flex-shrink-0 cursor-pointer transition-all duration-300"
                  style={{
                    width: "200px",
                    height: "240px",
                    transform: `scale(${scale})`,
                    opacity: opacity,
                    border: "4px solid #8B7355",
                    boxShadow: isActive 
                      ? "0 0 30px rgba(255,200,80,0.5), inset 0 0 12px rgba(0,0,0,0.8)" 
                      : "inset 0 0 12px rgba(0,0,0,0.8), 0 0 16px rgba(139,115,85,0.3)"
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
        </div>

        {/* Navigation arrows */}
        <button
          onClick={slidePrev}
          disabled={mobileIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: "rgba(139,115,85,0.8)",
            backdropFilter: "blur(4px)"
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={slideNext}
          disabled={mobileIndex >= frames.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: "rgba(139,115,85,0.8)",
            backdropFilter: "blur(4px)"
          }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Dots indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
          {frames.slice(0, Math.min(10, frames.length)).map((_, index) => (
            <button
              key={index}
              onClick={() => setMobileIndex(index)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: index === mobileIndex ? "#d4c4a0" : "rgba(255,255,255,0.3)"
              }}
            />
          ))}
          {frames.length > 10 && (
            <span className="text-white/50 text-xs ml-1">+{frames.length - 10}</span>
          )}
        </div>

        {/* Current item name */}
        {frames[mobileIndex] && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 text-center">
            <p className="text-sm text-[#d4c4a0] font-serif drop-shadow-lg max-w-[200px] truncate">
              {frames[mobileIndex].nom || `Luminaire ${mobileIndex + 1}`}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Desktop version - 3D corridor
  return (
    <div
      ref={galleryRef}
      className="relative w-full h-screen overflow-hidden"
      style={{
        perspective: "1200px",
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
        className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(20,16,10,0.9) 0%, transparent 100%)"
        }}
      />
      
      {/* Corridor atmosphere - right wall */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none"
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
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
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
          const xOffset = isLeft ? -580 : 580
          const rotateY = isLeft ? 12 : -12

          return (
            <div
              key={frame._id}
              onClick={() => handleFrameClick(frame._id)}
              className="absolute cursor-pointer group"
              style={{
                width: "260px",
                height: "300px",
                left: "50%",
                top: "50%",
                marginLeft: "-130px",
                marginTop: "-150px",
                transform: `translateX(${xOffset}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg)`,
                border: "6px solid #8B7355",
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.8), 0 0 24px rgba(139,115,85,0.3)",
                transition: "box-shadow 0.3s ease, transform 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "inset 0 0 12px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,80,0.6)"
                e.currentTarget.style.transform = `translateX(${xOffset}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg) scale(1.04)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "inset 0 0 12px rgba(0,0,0,0.8), 0 0 24px rgba(139,115,85,0.3)"
                e.currentTarget.style.transform = `translateX(${xOffset}px) translateZ(${-index * FRAME_SPACING}px) rotateY(${rotateY}deg)`
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

      {/* Scroll hint chevron */}
      {showScrollHint && (
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
        <h2 className="text-2xl md:text-3xl font-serif text-[#d4c4a0] drop-shadow-lg">
          Galerie Immersive
        </h2>
        <p className="text-sm text-[#a89878] mt-1">
          Scrollez pour explorer
        </p>
      </div>
    </div>
  )
}
