"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface VocabWord {
  id: string
  fr: string
  en: string
}

export type VocabPlayerStatus = "idle" | "preloading" | "playing" | "paused" | "finished" | "error"

export interface VocabPlayerState {
  status: VocabPlayerStatus
  activeThemeId: string | null
  index: number
  total: number
  preloadDone: number
  preloadTotal: number
  error: string | null
}

const FR_VOICE = "fr-FR-DeniseNeural"
const EN_VOICE = "en-GB-SoniaNeural"

// Silences volontaires entre les clips — jamais un setTimeout calé sur une
// durée de clip estimée (l'enchaînement des clips eux-mêmes repose uniquement
// sur l'event `ended` de l'<audio>, voir playWordClip()/handleClipEnded()).
const GAP_AFTER_FR_MS = 500
const GAP_AFTER_EN_MS = 800

// Nombre de clips /api/tts générés en parallèle pendant le préchargement d'un
// thème — assez pour être rapide, pas assez pour spammer Azure d'un coup.
const PRELOAD_CONCURRENCY = 6

// Cache mémoire de session (survit tant que l'onglet reste ouvert, partagé
// entre tous les thèmes) : si un mot/voix a déjà été synthétisé, on réutilise
// l'URL plutôt que de rappeler /api/tts — évite un appel réseau inutile et
// économise le palier gratuit Azure.
const clipCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

function cacheKey(voice: string, text: string): string {
  return `${voice}::${text}`
}

async function fetchClip(voice: string, text: string): Promise<string> {
  const key = cacheKey(voice, text)
  const cached = clipCache.get(key)
  if (cached) return cached
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} pour "${text}"`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    clipCache.set(key, url)
    return url
  })()
  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

// Précharge la totalité des clips (FR + EN pour chaque mot) AVANT que
// play() ne démarre la lecture — jamais pendant. Tourne en arrière-plan
// (workers concurrents sur fetch, tous asynchrones) donc ne bloque jamais le
// thread principal ni l'UI pendant le chargement.
async function preloadAll(words: VocabWord[], onProgress: (done: number, total: number) => void): Promise<void> {
  const queue: Array<{ voice: string; text: string }> = []
  for (const w of words) {
    queue.push({ voice: FR_VOICE, text: w.fr })
    queue.push({ voice: EN_VOICE, text: w.en })
  }
  const total = queue.length
  let done = 0
  onProgress(done, total)
  if (total === 0) return

  let cursor = 0
  async function worker() {
    while (cursor < queue.length) {
      const idx = cursor++
      const { voice, text } = queue[idx]
      await fetchClip(voice, text)
      done++
      onProgress(done, total)
    }
  }
  const workerCount = Math.min(PRELOAD_CONCURRENCY, queue.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

interface PendingGap {
  ms: number
  run: () => void
}

const IDLE_STATE: VocabPlayerState = {
  status: "idle",
  activeThemeId: null,
  index: 0,
  total: 0,
  preloadDone: 0,
  preloadTotal: 0,
  error: null,
}

// Séquenceur audio du mode "Musique" : précharge tous les clips d'un thème
// avant de démarrer, puis enchaîne FR -> silence 500ms -> EN -> silence 800ms
// -> mot suivant, uniquement sur l'event `ended` de l'audio (jamais de délai
// estimé). Un seul <audio> partagé pour tout le thème : on ne change son `src`
// qu'une fois le clip précédent terminé (`ended` reçu), donc aucun
// chevauchement possible. pause()/resume() agissent sur ce même élément
// (audio.pause()/play()) pour reprendre exactement où c'était, sans jamais
// redémarrer le mot en cours.
export function useVocabPlayer() {
  const [state, setState] = useState<VocabPlayerState>(IDLE_STATE)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wordsRef = useRef<VocabWord[]>([])
  const statusRef = useRef<VocabPlayerStatus>("idle")
  // "clip" = un audio FR/EN est en train (ou en pause) de jouer ; "gap" = on
  // attend le silence 500/800ms entre deux clips ; "none" = rien en cours.
  const modeRef = useRef<"clip" | "gap" | "none">("none")
  const pendingGapRef = useRef<PendingGap | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Incrémenté à chaque play()/stop() : toute callback async (timer, préchargement,
  // `ended`) issue d'une session précédente se voit ignorée si le token a changé
  // entretemps — protège contre un double-clic rapide sur "Écouter" ou un
  // changement de thème pendant qu'une lecture est en cours.
  const tokenRef = useRef(0)

  const updateState = useCallback((patch: Partial<VocabPlayerState>) => {
    setState((s) => {
      const next = { ...s, ...patch }
      statusRef.current = next.status
      return next
    })
  }, [])

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    return audioRef.current
  }, [])

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
  }, [])

  // Coupe net tout ce qui pourrait être en cours (clip qui joue, silence en
  // attente) sans toucher au state React — utilisé avant de démarrer une
  // nouvelle session et au démontage du composant.
  const hardStop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.pause()
    }
    clearGapTimer()
    pendingGapRef.current = null
    modeRef.current = "none"
  }, [clearGapTimer])

  const scheduleGap = useCallback(
    (token: number, ms: number, run: () => void) => {
      modeRef.current = "gap"
      pendingGapRef.current = { ms, run }
      gapTimerRef.current = setTimeout(() => {
        if (token !== tokenRef.current) return
        gapTimerRef.current = null
        pendingGapRef.current = null
        run()
      }, ms)
    },
    [],
  )

  const playWordClipRef = useRef<(token: number, index: number, sub: "fr" | "en") => void>(() => {})

  const handleClipEnded = useCallback(
    (token: number, index: number, sub: "fr" | "en") => {
      if (sub === "fr") {
        scheduleGap(token, GAP_AFTER_FR_MS, () => playWordClipRef.current(token, index, "en"))
      } else {
        scheduleGap(token, GAP_AFTER_EN_MS, () => playWordClipRef.current(token, index + 1, "fr"))
      }
    },
    [scheduleGap],
  )

  const playWordClip = useCallback(
    (token: number, index: number, sub: "fr" | "en") => {
      if (token !== tokenRef.current) return
      const words = wordsRef.current

      if (index >= words.length) {
        modeRef.current = "none"
        updateState({ status: "finished" })
        return
      }

      const word = words[index]
      const voice = sub === "fr" ? FR_VOICE : EN_VOICE
      const text = sub === "fr" ? word.fr : word.en
      const url = clipCache.get(cacheKey(voice, text))
      if (!url) {
        // Ne devrait pas arriver (preloadAll() a tourné avant play()) — filet
        // de sécurité si un clip a échoué silencieusement au préchargement.
        modeRef.current = "none"
        updateState({ status: "error", error: `Clip audio manquant pour "${text}".` })
        return
      }

      modeRef.current = "clip"
      const audio = getAudio()
      audio.onended = null
      audio.src = url
      audio.currentTime = 0
      audio.onended = () => {
        if (token !== tokenRef.current) return
        handleClipEnded(token, index, sub)
      }
      updateState({ status: "playing", index })
      audio.play().catch(() => {
        if (token !== tokenRef.current) return
        updateState({ status: "error", error: "Lecture audio bloquée par le navigateur — clique à nouveau sur Écouter." })
      })
    },
    [getAudio, handleClipEnded, updateState],
  )

  useEffect(() => {
    playWordClipRef.current = playWordClip
  }, [playWordClip])

  const play = useCallback(
    async (themeId: string, words: VocabWord[]) => {
      const myToken = ++tokenRef.current

      // "Débloque" l'élément <audio> pendant le geste utilisateur (ce clic)
      // avant le préchargement asynchrone qui suit : la lecture réelle (une
      // fois tous les clips prêts) peut survenir bien après ce clic, hors de
      // la fenêtre où les navigateurs autorisent play() sans interaction —
      // ce play()/pause() muet dans le même tick que le clic évite qu'elle
      // soit bloquée par la politique autoplay.
      const unlockAudio = getAudio()
      unlockAudio.muted = true
      unlockAudio.play().catch(() => {})
      unlockAudio.pause()
      unlockAudio.muted = false

      hardStop()
      wordsRef.current = words
      updateState({
        status: "preloading",
        activeThemeId: themeId,
        index: 0,
        total: words.length,
        preloadDone: 0,
        preloadTotal: words.length * 2,
        error: null,
      })

      try {
        await preloadAll(words, (done, total) => {
          if (tokenRef.current !== myToken) return
          updateState({ preloadDone: done, preloadTotal: total })
        })
      } catch (e) {
        if (tokenRef.current !== myToken) return
        updateState({ status: "error", error: "Échec du préchargement audio — vérifie ta connexion et réessaie." })
        return
      }
      if (tokenRef.current !== myToken) return // une session plus récente a pris le relais entretemps

      playWordClip(myToken, 0, "fr")
    },
    [getAudio, hardStop, playWordClip, updateState],
  )

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return
    if (modeRef.current === "clip") {
      audioRef.current?.pause()
    } else if (modeRef.current === "gap") {
      clearGapTimer() // pendingGapRef reste renseigné : resume() reprogramme le même silence
    }
    updateState({ status: "paused" })
  }, [clearGapTimer, updateState])

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return
    const token = tokenRef.current
    if (modeRef.current === "clip") {
      audioRef.current?.play().catch(() => {})
    } else if (modeRef.current === "gap" && pendingGapRef.current) {
      const { ms, run } = pendingGapRef.current
      gapTimerRef.current = setTimeout(() => {
        if (token !== tokenRef.current) return
        gapTimerRef.current = null
        pendingGapRef.current = null
        run()
      }, ms)
    }
    updateState({ status: "playing" })
  }, [updateState])

  const stop = useCallback(() => {
    tokenRef.current++
    hardStop()
    setState(IDLE_STATE)
    statusRef.current = "idle"
  }, [hardStop])

  useEffect(() => {
    return () => {
      tokenRef.current++
      hardStop()
    }
  }, [hardStop])

  return { state, play, pause, resume, stop }
}
