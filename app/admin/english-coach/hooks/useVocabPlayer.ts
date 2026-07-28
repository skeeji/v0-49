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

// Si une requête /api/tts individuelle ne répond pas dans ce délai, on
// l'abandonne (AbortController) plutôt que de laisser le worker de
// préchargement bloqué indéfiniment dessus.
const FETCH_TIMEOUT_MS = 15000

// Si un clip est lancé (audio.play() résolu) mais ne déclenche jamais l'event
// `ended` dans ce délai (clip corrompu, décodage qui ne se termine jamais...),
// on considère qu'il est cassé et on passe au mot suivant plutôt que de
// bloquer toute la session indéfiniment.
const CLIP_PLAYBACK_TIMEOUT_MS = 10000

const LOG_PREFIX = "[vocab-player]"

// Signale au système (écran de verrouillage, centre de contrôle) que cette
// page joue un contenu audio "légitime" en cours — c'est ce qui permet aux
// navigateurs mobiles de ne pas geler le JS (nos setTimeout de silence
// 500/800ms) ni suspendre l'AudioContext quand l'écran se verrouille ou que
// l'app passe en arrière-plan, exactement comme le fait un lecteur de
// musique/podcast. Sans ça, la page est traitée comme un onglet inactif
// classique et la lecture s'arrête net au verrouillage.
function updateMediaSessionMetadata(themeId: string, word: VocabWord, sub: "fr" | "en") {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: sub === "fr" ? `${word.fr} → ${word.en}` : `${word.en} (${word.fr})`,
      artist: "English Coach",
      album: themeId,
    })
  } catch (e) {
    // no-op — MediaMetadata indisponible sur ce navigateur
  }
}

function setMediaSessionPlaybackState(playbackState: "playing" | "paused" | "none") {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
  navigator.mediaSession.playbackState = playbackState
}

// Cache mémoire de session (survit tant que l'onglet reste ouvert, partagé
// entre tous les thèmes) : si un mot/voix a déjà été synthétisé, on réutilise
// l'URL plutôt que de rappeler /api/tts — évite un appel réseau inutile et
// économise le palier gratuit Azure.
const clipCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

function cacheKey(voice: string, text: string): string {
  return `${voice}::${text}`
}

async function fetchClip(voice: string, text: string, logLabel: string): Promise<string> {
  const key = cacheKey(voice, text)
  const cached = clipCache.get(key)
  if (cached) return cached
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    const startedAt = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
        signal: controller.signal,
      })
      const elapsed = Math.round(performance.now() - startedAt)
      if (!res.ok) {
        console.error(`${LOG_PREFIX} ${logLabel} — échec HTTP ${res.status} après ${elapsed}ms`)
        throw new Error(`HTTP ${res.status} pour "${text}"`)
      }
      const blob = await res.blob()
      if (!blob.size) {
        console.error(`${LOG_PREFIX} ${logLabel} — blob vide reçu (0 octet) après ${elapsed}ms`)
        throw new Error(`Blob vide pour "${text}"`)
      }
      const url = URL.createObjectURL(blob)
      clipCache.set(key, url)
      console.log(`${LOG_PREFIX} ${logLabel} — OK, ${blob.size} octets en ${elapsed}ms`)
      return url
    } catch (e: any) {
      if (e?.name === "AbortError") {
        console.error(`${LOG_PREFIX} ${logLabel} — timeout après ${FETCH_TIMEOUT_MS}ms, requête annulée`)
        throw new Error(`Timeout pour "${text}"`)
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
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
// (workers concurrents sur fetch, tous asynchrones, limités à
// PRELOAD_CONCURRENCY à la fois) donc ne bloque jamais le thread principal ni
// l'UI pendant le chargement, et évite de spammer Azure de dizaines
// d'appels simultanés.
async function preloadAll(words: VocabWord[], onProgress: (done: number, total: number) => void): Promise<void> {
  const queue: Array<{ voice: string; text: string; label: string }> = []
  words.forEach((w, i) => {
    queue.push({ voice: FR_VOICE, text: w.fr, label: `mot ${i + 1}/${words.length} FR "${w.fr}"` })
    queue.push({ voice: EN_VOICE, text: w.en, label: `mot ${i + 1}/${words.length} EN "${w.en}"` })
  })
  const total = queue.length
  let done = 0
  onProgress(done, total)
  if (total === 0) return

  let cursor = 0
  async function worker() {
    while (cursor < queue.length) {
      const idx = cursor++
      const { voice, text, label } = queue[idx]
      await fetchClip(voice, text, label)
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

interface CurrentClip {
  index: number
  sub: "fr" | "en"
  label: string
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
// redémarrer le mot en cours. Un watchdog (CLIP_PLAYBACK_TIMEOUT_MS) et un
// handler `onerror` protègent contre un clip cassé qui ne déclencherait
// jamais `ended` : plutôt que de bloquer la session, on logue et on saute au
// mot suivant.
export function useVocabPlayer() {
  const [state, setState] = useState<VocabPlayerState>(IDLE_STATE)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wordsRef = useRef<VocabWord[]>([])
  const themeIdRef = useRef<string>("")
  const statusRef = useRef<VocabPlayerStatus>("idle")
  // "clip" = un audio FR/EN est en train (ou en pause) de jouer ; "gap" = on
  // attend le silence 500/800ms entre deux clips ; "none" = rien en cours.
  const modeRef = useRef<"clip" | "gap" | "none">("none")
  const pendingGapRef = useRef<PendingGap | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentClipRef = useRef<CurrentClip | null>(null)
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

  const clearClipWatchdog = useCallback(() => {
    if (clipWatchdogRef.current) {
      clearTimeout(clipWatchdogRef.current)
      clipWatchdogRef.current = null
    }
  }, [])

  // Coupe net tout ce qui pourrait être en cours (clip qui joue, silence en
  // attente) sans toucher au state React — utilisé avant de démarrer une
  // nouvelle session et au démontage du composant.
  const hardStop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    clearGapTimer()
    clearClipWatchdog()
    pendingGapRef.current = null
    currentClipRef.current = null
    modeRef.current = "none"
  }, [clearGapTimer, clearClipWatchdog])

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

  // Filet de sécurité appelé quand un clip en cours de lecture ne se termine
  // jamais correctement (timeout du watchdog ou event `onerror`) : on logue
  // la raison précisément (mot, langue, texte) et on saute directement au FR
  // du mot suivant, sans attendre l'EN du mot cassé.
  const advanceAfterFailure = useCallback(
    (token: number, reason: string) => {
      if (token !== tokenRef.current) return
      const current = currentClipRef.current
      console.error(`${LOG_PREFIX} ${current?.label ?? "clip inconnu"} — ${reason}, passage au mot suivant`)
      clearClipWatchdog()
      const audio = audioRef.current
      if (audio) {
        audio.onended = null
        audio.onerror = null
        audio.pause()
      }
      modeRef.current = "none"
      const nextIndex = (current?.index ?? -1) + 1
      playWordClipRef.current(token, nextIndex, "fr")
    },
    [clearClipWatchdog],
  )

  const startClipWatchdog = useCallback(
    (token: number) => {
      clearClipWatchdog()
      clipWatchdogRef.current = setTimeout(() => {
        advanceAfterFailure(token, `aucun événement "ended" reçu après ${CLIP_PLAYBACK_TIMEOUT_MS}ms`)
      }, CLIP_PLAYBACK_TIMEOUT_MS)
    },
    [advanceAfterFailure, clearClipWatchdog],
  )

  const playWordClip = useCallback(
    (token: number, index: number, sub: "fr" | "en") => {
      if (token !== tokenRef.current) return
      const words = wordsRef.current

      if (index >= words.length) {
        modeRef.current = "none"
        currentClipRef.current = null
        updateState({ status: "finished" })
        return
      }

      const word = words[index]
      const voice = sub === "fr" ? FR_VOICE : EN_VOICE
      const text = sub === "fr" ? word.fr : word.en
      const label = `mot ${index + 1}/${words.length} ${sub.toUpperCase()} "${text}"`
      const url = clipCache.get(cacheKey(voice, text))
      if (!url) {
        // Ne devrait pas arriver (preloadAll() a tourné avant play()) — filet
        // de sécurité si un clip a échoué silencieusement au préchargement.
        console.error(`${LOG_PREFIX} ${label} — clip manquant dans le cache (échec du préchargement)`)
        modeRef.current = "none"
        updateState({ status: "error", error: `Clip audio manquant pour "${text}".` })
        return
      }

      modeRef.current = "clip"
      currentClipRef.current = { index, sub, label }
      updateMediaSessionMetadata(themeIdRef.current, word, sub)
      const audio = getAudio()
      audio.onended = null
      audio.onerror = null
      audio.src = url
      audio.currentTime = 0
      audio.onended = () => {
        if (token !== tokenRef.current) return
        clearClipWatchdog()
        handleClipEnded(token, index, sub)
      }
      audio.onerror = () => {
        advanceAfterFailure(token, `erreur de lecture audio (code ${audio.error?.code ?? "inconnu"})`)
      }
      updateState({ status: "playing", index })
      setMediaSessionPlaybackState("playing")
      audio
        .play()
        .then(() => {
          if (token !== tokenRef.current) return
          startClipWatchdog(token)
        })
        .catch(() => {
          if (token !== tokenRef.current) return
          updateState({ status: "error", error: "Lecture audio bloquée par le navigateur — clique à nouveau sur Écouter." })
        })
    },
    [getAudio, handleClipEnded, updateState, clearClipWatchdog, advanceAfterFailure, startClipWatchdog],
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
      themeIdRef.current = themeId
      updateState({
        status: "preloading",
        activeThemeId: themeId,
        index: 0,
        total: words.length,
        preloadDone: 0,
        preloadTotal: words.length * 2,
        error: null,
      })

      console.log(`${LOG_PREFIX} Préchargement du thème "${themeId}" — ${words.length} mots (${words.length * 2} clips)`)

      try {
        await preloadAll(words, (done, total) => {
          if (tokenRef.current !== myToken) return
          updateState({ preloadDone: done, preloadTotal: total })
        })
      } catch (e) {
        if (tokenRef.current !== myToken) return
        console.error(`${LOG_PREFIX} Échec du préchargement du thème "${themeId}":`, e)
        updateState({ status: "error", error: "Échec du préchargement audio — vérifie ta connexion et réessaie." })
        return
      }
      if (tokenRef.current !== myToken) return // une session plus récente a pris le relais entretemps

      console.log(`${LOG_PREFIX} Préchargement terminé pour "${themeId}", démarrage de la lecture`)
      playWordClip(myToken, 0, "fr")
    },
    [getAudio, hardStop, playWordClip, updateState],
  )

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return
    if (modeRef.current === "clip") {
      audioRef.current?.pause()
      clearClipWatchdog()
    } else if (modeRef.current === "gap") {
      clearGapTimer() // pendingGapRef reste renseigné : resume() reprogramme le même silence
    }
    updateState({ status: "paused" })
    setMediaSessionPlaybackState("paused")
  }, [clearGapTimer, clearClipWatchdog, updateState])

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return
    const token = tokenRef.current
    if (modeRef.current === "clip") {
      audioRef.current
        ?.play()
        .then(() => {
          if (token !== tokenRef.current) return
          startClipWatchdog(token)
        })
        .catch(() => {})
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
    setMediaSessionPlaybackState("playing")
  }, [updateState, startClipWatchdog])

  const stop = useCallback(() => {
    tokenRef.current++
    hardStop()
    setState(IDLE_STATE)
    statusRef.current = "idle"
    setMediaSessionPlaybackState("none")
  }, [hardStop])

  // Relie les contrôles système (écran de verrouillage, casque, centre de
  // contrôle) à ce lecteur — c'est ce qui, avec updateMediaSessionMetadata(),
  // fait reconnaître la page comme une vraie session de lecture audio par le
  // navigateur/OS plutôt qu'un onglet inactif ordinaire.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    navigator.mediaSession.setActionHandler("play", () => resume())
    navigator.mediaSession.setActionHandler("pause", () => pause())
    navigator.mediaSession.setActionHandler("stop", () => stop())
    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null)
        navigator.mediaSession.setActionHandler("pause", null)
        navigator.mediaSession.setActionHandler("stop", null)
      } catch (e) {
        // no-op
      }
    }
  }, [pause, resume, stop])

  useEffect(() => {
    return () => {
      tokenRef.current++
      hardStop()
    }
  }, [hardStop])

  return { state, play, pause, resume, stop }
}
