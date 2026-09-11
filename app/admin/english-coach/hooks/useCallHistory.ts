"use client"

import { useCallback, useEffect, useState } from "react"

// Historique des appels (Appel) — permet de rejouer un appel terminé pour se
// réécouter après une vraie session sur chantier. Stocké en localStorage,
// comme useFavorites : ce n'est pas une progression de maîtrise, juste un
// journal personnel côté appareil. Seules les répliques du correspondant sont
// réellement "réécoutables" (resynthétisées à la demande via Azure TTS, texte
// + voix sauvegardés) — les réponses de l'utilisateur restent en texte seul,
// la reconnaissance vocale du navigateur ne fournissant pas d'audio exploitable.
const STORAGE_KEY = "englishCoach.callHistory.v1"
const MAX_ENTRIES = 20

export interface CallHistoryLine {
  isUser: boolean
  line: string
  fr?: string
  who?: string
  // Voix Azure du correspondant au moment de cette réplique — absente pour
  // les lignes de l'utilisateur (jamais resynthétisées).
  voice?: string
}

export interface CallHistoryEntry {
  id: string
  scenarioTitle: string
  timestamp: string
  lines: CallHistoryLine[]
}

function loadFromStorage(): CallHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("[call-history] ❌ Erreur lecture localStorage:", e)
    return []
  }
}

function saveToStorage(entries: CallHistoryEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    console.error("[call-history] ❌ Erreur écriture localStorage:", e)
  }
}

export function useCallHistory() {
  const [history, setHistory] = useState<CallHistoryEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setHistory(loadFromStorage())
    setLoaded(true)
  }, [])

  // Ignore les appels sans aucune réplique (raccroché avant la première
  // question) — rien d'utile à réécouter.
  const saveCall = useCallback((scenarioTitle: string, lines: CallHistoryLine[]) => {
    if (!lines.length) return
    const entry: CallHistoryEntry = {
      id: `call-${Date.now()}`,
      scenarioTitle,
      timestamp: new Date().toISOString(),
      lines,
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES)
      saveToStorage(next)
      return next
    })
  }, [])

  const removeCall = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((c) => c.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    saveToStorage([])
  }, [])

  return { history, loaded, saveCall, removeCall, clearHistory }
}
