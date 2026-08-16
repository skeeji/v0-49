"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadTone } from "./toneLoader"

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
  // "fr" ou "en" selon le clip actuellement entendu pour le mot en cours —
  // sert uniquement à l'affichage (mettre en évidence la bonne langue dans le
  // visuel synchronisé de MusicSession), jamais utilisé pour piloter l'audio.
  sub: "fr" | "en" | null
  preloadDone: number
  preloadTotal: number
  error: string | null
}

const FR_VOICE = "fr-FR-DeniseNeural"
const EN_VOICE = "en-GB-SoniaNeural"

// Silences volontaires entre les clips, exprimés en ms puis convertis en
// secondes au moment de construire le planning (voir scheduleFrom()).
const GAP_AFTER_FR_MS = 500
const GAP_AFTER_EN_MS = 800

// Marge avant le premier clip d'un planning (play() initial ou resume()
// après pause) pour laisser à Tone.Player le temps de démarrer proprement.
const START_LOOKAHEAD_S = 0.15

// Fréquence de rafraîchissement de l'UI (mot en cours, statut) — purement
// cosmétique : la lecture audio elle-même ne dépend jamais de ce timer, voir
// le commentaire au-dessus de useVocabPlayer().
const UI_TICK_MS = 400

// Nombre de clips /api/tts générés en parallèle pendant le préchargement d'un
// thème — assez pour être rapide, pas assez pour spammer Azure d'un coup.
const PRELOAD_CONCURRENCY = 6

// Si une requête /api/tts individuelle ne répond pas dans ce délai, on
// l'abandonne (AbortController) plutôt que de laisser le worker de
// préchargement bloqué indéfiniment dessus.
const FETCH_TIMEOUT_MS = 15000

const LOG_PREFIX = "[vocab-player]"

// Signale au système (écran de verrouillage, centre de contrôle) que cette
// page joue un contenu audio "légitime" en cours — combiné au fait que la
// lecture repose maintenant sur le même AudioContext Tone.js que la musique
// de fond (jamais suspendu entre deux mots, voir scheduleFrom()), c'est ce
// qui permet à la session de survivre au verrouillage de l'écran plutôt que
// d'être traitée comme un onglet inactif ordinaire.
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
// entre tous les thèmes) : si un mot/voix a déjà été synthétisé ET décodé, on
// réutilise l'AudioBuffer plutôt que de rappeler /api/tts — évite un appel
// réseau inutile et économise le palier gratuit Azure.
const bufferCache = new Map<string, AudioBuffer>()
const inflight = new Map<string, Promise<AudioBuffer>>()

function cacheKey(voice: string, text: string): string {
  return `${voice}::${text}`
}

async function fetchAndDecodeClip(Tone: any, voice: string, text: string, logLabel: string): Promise<AudioBuffer> {
  const key = cacheKey(voice, text)
  const cached = bufferCache.get(key)
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
      const arrayBuffer = await res.arrayBuffer()
      if (!arrayBuffer.byteLength) {
        console.error(`${LOG_PREFIX} ${logLabel} — réponse vide (0 octet) après ${elapsed}ms`)
        throw new Error(`Réponse vide pour "${text}"`)
      }
      const audioBuffer: AudioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer)
      bufferCache.set(key, audioBuffer)
      console.log(`${LOG_PREFIX} ${logLabel} — OK, ${arrayBuffer.byteLength} octets en ${elapsed}ms`)
      return audioBuffer
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

// Précharge ET décode la totalité des clips (FR + EN pour chaque mot) AVANT
// que la lecture ne démarre — jamais pendant. Tourne en arrière-plan
// (workers concurrents sur fetch, tous asynchrones, limités à
// PRELOAD_CONCURRENCY à la fois) donc ne bloque jamais le thread principal ni
// l'UI pendant le chargement, et évite de spammer Azure de dizaines d'appels
// simultanés.
async function preloadAll(Tone: any, words: VocabWord[], onProgress: (done: number, total: number) => void): Promise<void> {
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
      await fetchAndDecodeClip(Tone, voice, text, label)
      done++
      onProgress(done, total)
    }
  }
  const workerCount = Math.min(PRELOAD_CONCURRENCY, queue.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

// Une entrée par clip (FR puis EN) dans l'ordre de lecture du thème entier —
// "pos" est l'indice dans cette liste à plat, indépendant de l'indice du mot.
interface ClipRef {
  index: number
  sub: "fr" | "en"
}

function buildClipList(words: VocabWord[]): ClipRef[] {
  const list: ClipRef[] = []
  words.forEach((_, index) => {
    list.push({ index, sub: "fr" })
    list.push({ index, sub: "en" })
  })
  return list
}

interface ScheduledEvent {
  pos: number
  index: number
  sub: "fr" | "en"
  time: number
}

interface ScheduleResult {
  events: ScheduledEvent[]
  players: any[]
  endTime: number
}

// Planifie TOUS les clips restants d'un coup, chacun sur son propre
// Tone.Player, avec un temps de départ absolu (horloge du Tone.AudioContext)
// — jamais via setTimeout. C'est ce qui rend la lecture insensible au
// throttling du thread principal : une fois `.start(time)` appelé, c'est le
// moteur audio natif du navigateur qui déclenche la lecture à l'heure dite,
// même si l'onglet est réduit ou l'écran verrouillé entretemps. Le contexte
// audio partagé avec la musique de fond (useBackgroundMusic) reste "running"
// en continu pendant toute la session (jamais suspendu entre deux mots),
// donc l'onglet garde le statut "lit un contenu audio" aux yeux du
// navigateur/OS et n'est jamais mis en veille agressive comme un onglet
// inactif classique.
function scheduleFrom(Tone: any, words: VocabWord[], clipList: ClipRef[], fromPos: number, startAt: number): ScheduleResult {
  const events: ScheduledEvent[] = []
  const players: any[] = []
  let t = startAt
  for (let pos = fromPos; pos < clipList.length; pos++) {
    const { index, sub } = clipList[pos]
    const word = words[index]
    const voice = sub === "fr" ? FR_VOICE : EN_VOICE
    const text = sub === "fr" ? word.fr : word.en
    const buffer = bufferCache.get(cacheKey(voice, text))
    if (!buffer) {
      // Ne devrait pas arriver (preloadAll() a tourné avant scheduleFrom()) —
      // filet de sécurité si un clip a échoué silencieusement au préchargement.
      console.error(`${LOG_PREFIX} mot ${index + 1}/${words.length} ${sub.toUpperCase()} "${text}" — clip manquant dans le cache, ignoré`)
      continue
    }
    events.push({ pos, index, sub, time: t })
    const player = new Tone.Player(buffer).toDestination()
    player.start(t)
    players.push(player)
    const gapMs = sub === "fr" ? GAP_AFTER_FR_MS : GAP_AFTER_EN_MS
    t += buffer.duration + gapMs / 1000
  }
  return { events, players, endTime: t }
}

const IDLE_STATE: VocabPlayerState = {
  status: "idle",
  activeThemeId: null,
  index: 0,
  total: 0,
  sub: null,
  preloadDone: 0,
  preloadTotal: 0,
  error: null,
}

export function useVocabPlayer() {
  const [state, setState] = useState<VocabPlayerState>(IDLE_STATE)

  const toneRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wordsRef = useRef<VocabWord[]>([])
  const themeIdRef = useRef<string>("")
  const clipListRef = useRef<ClipRef[]>([])
  const statusRef = useRef<VocabPlayerStatus>("idle")
  const eventsRef = useRef<ScheduledEvent[]>([])
  const playersRef = useRef<any[]>([])
  const endTimeRef = useRef(0)
  const pausedAtPosRef = useRef(0)
  const lastUiIndexRef = useRef(-1)
  const lastUiSubRef = useRef<"fr" | "en" | null>(null)
  const uiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Incrémenté à chaque play()/stop() : toute callback async (préchargement,
  // tick UI) issue d'une session précédente se voit ignorée si le token a
  // changé entretemps — protège contre un double-clic rapide sur "Écouter" ou
  // un changement de thème pendant qu'une lecture est en cours.
  const tokenRef = useRef(0)

  const updateState = useCallback((patch: Partial<VocabPlayerState>) => {
    setState((s) => {
      const next = { ...s, ...patch }
      statusRef.current = next.status
      return next
    })
  }, [])

  const clearUiInterval = useCallback(() => {
    if (uiIntervalRef.current) {
      clearInterval(uiIntervalRef.current)
      uiIntervalRef.current = null
    }
  }, [])

  // Purement cosmétique (met à jour "mot X/Y" et la métadonnée Media
  // Session) : si ce timer est lui-même throttlé pendant que l'écran est
  // verrouillé, aucune conséquence sur l'audio — au pire l'UI rattrape son
  // retard au prochain tick ou au retour au premier plan.
  const tickUi = useCallback(
    (token: number) => {
      if (token !== tokenRef.current) return
      const ctx = audioCtxRef.current
      if (!ctx) return
      const now = ctx.currentTime
      if (now >= endTimeRef.current) {
        clearUiInterval()
        updateState({ status: "finished" })
        setMediaSessionPlaybackState("none")
        return
      }
      const events = eventsRef.current
      let current: ScheduledEvent | null = null
      for (const ev of events) {
        if (ev.time <= now) current = ev
        else break
      }
      if (current && (current.index !== lastUiIndexRef.current || current.sub !== lastUiSubRef.current)) {
        lastUiIndexRef.current = current.index
        lastUiSubRef.current = current.sub
        pausedAtPosRef.current = current.pos
        updateState({ index: current.index, sub: current.sub })
        updateMediaSessionMetadata(themeIdRef.current, wordsRef.current[current.index], current.sub)
      }
    },
    [clearUiInterval, updateState],
  )

  const tickUiRef = useRef(tickUi)
  useEffect(() => {
    tickUiRef.current = tickUi
  }, [tickUi])

  const startUiInterval = useCallback(
    (token: number) => {
      clearUiInterval()
      uiIntervalRef.current = setInterval(() => tickUiRef.current(token), UI_TICK_MS)
    },
    [clearUiInterval],
  )

  // Rattrape immédiatement l'UI dès que l'onglet redevient visible (retour au
  // premier plan / déverrouillage), sans attendre le prochain tick régulier.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && statusRef.current === "playing") {
        tickUiRef.current(tokenRef.current)
      }
    }
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [])

  // Coupe net tout ce qui pourrait être en cours (clips planifiés, timer UI)
  // sans toucher au state React — utilisé avant de démarrer une nouvelle
  // session, avant une pause et au démontage du composant. Le contexte audio
  // lui-même (toneRef/audioCtxRef) n'est jamais touché ici : il reste
  // "running" en continu pour toute la durée de la page (voir scheduleFrom()).
  const hardStop = useCallback(() => {
    clearUiInterval()
    playersRef.current.forEach((p) => {
      try {
        p.stop()
      } catch (e) {
        // no-op — déjà arrêté/jamais démarré
      }
      try {
        p.dispose()
      } catch (e) {
        // no-op
      }
    })
    playersRef.current = []
    eventsRef.current = []
    endTimeRef.current = 0
  }, [clearUiInterval])

  const play = useCallback(
    async (themeId: string, words: VocabWord[]) => {
      const myToken = ++tokenRef.current

      hardStop()
      wordsRef.current = words
      themeIdRef.current = themeId
      clipListRef.current = buildClipList(words)
      lastUiIndexRef.current = -1
      lastUiSubRef.current = null
      pausedAtPosRef.current = 0
      updateState({
        status: "preloading",
        activeThemeId: themeId,
        index: 0,
        total: words.length,
        sub: null,
        preloadDone: 0,
        preloadTotal: words.length * 2,
        error: null,
      })

      let Tone: any
      try {
        Tone = await loadTone()
        // Doit être déclenché par un geste utilisateur (le clic "Écouter") —
        // appelé ici comme première opération asynchrone du handler pour
        // rester dans la fenêtre autorisée par la politique autoplay des
        // navigateurs.
        await Tone.start()
      } catch (e) {
        if (tokenRef.current !== myToken) return
        console.error(`${LOG_PREFIX} échec d'initialisation audio:`, e)
        updateState({ status: "error", error: "Impossible d'initialiser l'audio — réessaie." })
        return
      }
      if (tokenRef.current !== myToken) return
      toneRef.current = Tone
      audioCtxRef.current = Tone.getContext().rawContext

      console.log(`${LOG_PREFIX} Préchargement du thème "${themeId}" — ${words.length} mots (${words.length * 2} clips)`)
      try {
        await preloadAll(Tone, words, (done, total) => {
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
      const ctx = audioCtxRef.current!
      const { events, players, endTime } = scheduleFrom(Tone, words, clipListRef.current, 0, ctx.currentTime + START_LOOKAHEAD_S)
      eventsRef.current = events
      playersRef.current = players
      endTimeRef.current = endTime
      lastUiIndexRef.current = 0
      lastUiSubRef.current = "fr"
      updateState({ status: "playing", index: 0, sub: "fr" })
      updateMediaSessionMetadata(themeId, words[0], "fr")
      setMediaSessionPlaybackState("playing")
      startUiInterval(myToken)
    },
    [hardStop, updateState, startUiInterval],
  )

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return
    hardStop()
    updateState({ status: "paused" })
    setMediaSessionPlaybackState("paused")
  }, [hardStop, updateState])

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return
    const token = tokenRef.current
    const Tone = toneRef.current
    const ctx = audioCtxRef.current
    const words = wordsRef.current
    if (!Tone || !ctx || !words.length) return

    const { events, players, endTime } = scheduleFrom(Tone, words, clipListRef.current, pausedAtPosRef.current, ctx.currentTime + START_LOOKAHEAD_S)
    eventsRef.current = events
    playersRef.current = players
    endTimeRef.current = endTime
    const resumedSub = clipListRef.current[pausedAtPosRef.current]?.sub ?? lastUiSubRef.current
    lastUiSubRef.current = resumedSub
    updateState({ status: "playing", sub: resumedSub })
    setMediaSessionPlaybackState("playing")
    startUiInterval(token)
  }, [updateState, startUiInterval])

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
