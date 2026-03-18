"use client"

import { useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"

const SCROLL_STORAGE_KEY = "scroll_positions"

interface ScrollData {
  position: number
  timestamp: number
}

// Get scroll positions from sessionStorage
function getScrollPositions(): Record<string, ScrollData> {
  if (typeof window === "undefined") return {}
  try {
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save scroll positions to sessionStorage
function saveScrollPositions(positions: Record<string, ScrollData>) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions))
  } catch {
    // Ignore storage errors
  }
}

export function useScrollRestoration(pageKey: string) {
  const pathname = usePathname()

  // Save scroll position before navigating away
  const saveScrollPosition = useCallback(() => {
    const positions = getScrollPositions()
    positions[pageKey] = {
      position: window.scrollY,
      timestamp: Date.now(),
    }
    saveScrollPositions(positions)
  }, [pageKey])

  // Restore scroll position when returning to the page
  const restoreScrollPosition = useCallback(() => {
    const positions = getScrollPositions()
    const savedData = positions[pageKey]
    
    if (savedData) {
      // Only restore if saved within last 30 minutes
      const thirtyMinutes = 30 * 60 * 1000
      if (Date.now() - savedData.timestamp < thirtyMinutes) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedData.position,
            behavior: "instant",
          })
        })
      }
    }
  }, [pageKey])

  // Clear saved position for this page
  const clearScrollPosition = useCallback(() => {
    const positions = getScrollPositions()
    delete positions[pageKey]
    saveScrollPositions(positions)
  }, [pageKey])

  // Restore on mount if coming back
  useEffect(() => {
    // Check if we're coming back from a detail page
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const isBackNavigation = navEntries.length > 0 && navEntries[0].type === "back_forward"
    
    // Also check history state
    const historyState = window.history.state
    const shouldRestore = isBackNavigation || historyState?.scrollRestoration === true

    if (shouldRestore) {
      // Small delay to ensure content is loaded
      const timeoutId = setTimeout(() => {
        restoreScrollPosition()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [restoreScrollPosition])

  // Save position on scroll (throttled)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        saveScrollPosition()
      }, 200)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timeoutId)
    }
  }, [saveScrollPosition])

  // Save position before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [saveScrollPosition])

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  }
}

// Hook to mark that we should restore scroll when going back
export function useMarkScrollRestoration() {
  const saveForRestoration = useCallback(() => {
    // Set history state to indicate scroll should be restored
    window.history.replaceState(
      { ...window.history.state, scrollRestoration: true },
      ""
    )
  }, [])

  return { saveForRestoration }
}
