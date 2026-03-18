"use client"

import { useEffect, useCallback, useRef } from "react"

const SCROLL_STORAGE_KEY = "scroll_positions"
const SHOULD_RESTORE_KEY = "should_restore_scroll"

interface ScrollData {
  position: number
  timestamp: number
  itemCount: number
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

// Check if we should restore scroll
function getShouldRestore(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(SHOULD_RESTORE_KEY) === "true"
  } catch {
    return false
  }
}

// Set restore flag
function setShouldRestore(value: boolean) {
  if (typeof window === "undefined") return
  try {
    if (value) {
      sessionStorage.setItem(SHOULD_RESTORE_KEY, "true")
    } else {
      sessionStorage.removeItem(SHOULD_RESTORE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function useScrollRestoration(pageKey: string, itemCount: number = 0) {
  const hasRestored = useRef(false)
  const restorationAttempts = useRef(0)

  // Save scroll position before navigating away
  const saveScrollPosition = useCallback(() => {
    const positions = getScrollPositions()
    positions[pageKey] = {
      position: window.scrollY,
      timestamp: Date.now(),
      itemCount: itemCount,
    }
    saveScrollPositions(positions)
    setShouldRestore(true)
  }, [pageKey, itemCount])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    const positions = getScrollPositions()
    const savedData = positions[pageKey]
    
    if (savedData && !hasRestored.current) {
      // Only restore if saved within last 30 minutes
      const thirtyMinutes = 30 * 60 * 1000
      if (Date.now() - savedData.timestamp < thirtyMinutes) {
        hasRestored.current = true
        
        // Use requestAnimationFrame for smooth restoration
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedData.position,
            behavior: "instant",
          })
        })
        
        // Clear the restore flag
        setShouldRestore(false)
        return true
      }
    }
    return false
  }, [pageKey])

  // Try to restore when items are loaded
  useEffect(() => {
    const shouldRestore = getShouldRestore()
    
    if (shouldRestore && itemCount > 0 && !hasRestored.current) {
      const positions = getScrollPositions()
      const savedData = positions[pageKey]
      
      if (savedData) {
        // Wait a bit for content to render
        const timeoutId = setTimeout(() => {
          if (restorationAttempts.current < 5) {
            restorationAttempts.current++
            restoreScrollPosition()
          }
        }, 100)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [pageKey, itemCount, restoreScrollPosition])

  // Reset restoration state on mount
  useEffect(() => {
    hasRestored.current = false
    restorationAttempts.current = 0
  }, [])

  return {
    saveScrollPosition,
    restoreScrollPosition,
  }
}

// Hook to mark that we should restore scroll when going back
export function useMarkScrollRestoration() {
  const saveForRestoration = useCallback(() => {
    setShouldRestore(true)
  }, [])

  return { saveForRestoration }
}
