"use client"

import { useCallback, useEffect, useState } from "react"

// Fiche mémo — favoris "coeur" déclenchés depuis Musique (et potentiellement
// d'autres onglets à l'avenir). Stocké en localStorage plutôt que via
// /api/progress : ce n'est pas une progression de maîtrise (mastery/wrong/
// timesShown), juste une sélection personnelle de phrases à garder sous la
// main avant le départ — purement côté appareil, aucun schéma serveur à créer
// pour ça. Limite : ne se synchronise pas entre appareils/navigateurs.
const STORAGE_KEY = "englishCoach.favorites.v1"

export interface FavoriteItem {
  id: string
  fr: string
  en: string
  tip: string
}

function loadFromStorage(): FavoriteItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("[favorites] ❌ Erreur lecture localStorage:", e)
    return []
  }
}

function saveToStorage(items: FavoriteItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error("[favorites] ❌ Erreur écriture localStorage:", e)
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setFavorites(loadFromStorage())
    setLoaded(true)
  }, [])

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites])

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.id === item.id) ? prev.filter((f) => f.id !== item.id) : [...prev, item]
      saveToStorage(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  return { favorites, loaded, isFavorite, toggleFavorite, removeFavorite }
}
