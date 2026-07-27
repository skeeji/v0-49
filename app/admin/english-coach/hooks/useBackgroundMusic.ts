"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Bundle UMD officiel de Tone.js, chargé à la demande via une balise <script>
// plutôt qu'un import npm — évite de toucher au package.json racine du site
// (hors du périmètre de cette page), même pattern que le SDK Azure Speech
// (voir useSpeech.ts).
const TONE_CDN_URL = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js"

let tonePromise: Promise<any> | null = null
function loadTone(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  const w = window as any
  if (w.Tone) return Promise.resolve(w.Tone)
  if (tonePromise) return tonePromise
  tonePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = TONE_CDN_URL
    script.async = true
    script.onload = () => {
      if (w.Tone) resolve(w.Tone)
      else reject(new Error("Tone introuvable après chargement du script"))
    }
    script.onerror = () => reject(new Error("échec du chargement du script Tone.js"))
    document.head.appendChild(script)
  })
  return tonePromise
}

// Volume de la boucle de fond, en retrait de la voix TTS (0 dB) pour ne pas
// gêner la compréhension des mots, mais nettement plus audible qu'avant.
const BACKGROUND_VOLUME_DB = -10
const LOOP_BPM = 84

// Piste de fond 100% synthétisée dans le navigateur (aucun fichier audio
// externe) : une boucle rythmique douce (kick + petit arpège), tournant sur
// son propre Tone.Transport — un timeline audio totalement indépendant de la
// balise <audio> utilisée par useVocabPlayer pour la voix. Cette piste ne lit
// ni n'écrit jamais l'état du séquenceur de mots : elle ne fait qu'accompagner
// la session en fond, start()/pause()/resume()/stop() sont appelés à côté par
// MusicSession, jamais depuis l'intérieur de useVocabPlayer.
export function useBackgroundMusic() {
  const [enabled, setEnabled] = useState(true)
  const [playing, setPlaying] = useState(false)

  const toneRef = useRef<any>(null)
  const volumeNodeRef = useRef<any>(null)
  const loopRef = useRef<any>(null)
  const builtRef = useRef(false)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const build = useCallback((Tone: any) => {
    if (builtRef.current) return
    builtRef.current = true

    const volume = new Tone.Volume(enabledRef.current ? BACKGROUND_VOLUME_DB : -Infinity).toDestination()
    volumeNodeRef.current = volume

    const kick = new Tone.MembraneSynth({
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0 },
    }).connect(volume)

    const pluck = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.05, release: 0.4 },
    }).connect(volume)

    const kickSteps = ["C2", null, null, null, "C2", null, null, null]
    const pluckSteps = ["C4", null, "E4", null, "G4", null, "E4", null]
    let step = 0

    const loop = new Tone.Loop((time: number) => {
      const k = kickSteps[step % kickSteps.length]
      const p = pluckSteps[step % pluckSteps.length]
      if (k) kick.triggerAttackRelease(k, "8n", time)
      if (p) pluck.triggerAttackRelease(p, "8n", time, 0.3)
      step++
    }, "8n")

    Tone.Transport.bpm.value = LOOP_BPM
    loopRef.current = loop
  }, [])

  const start = useCallback(async () => {
    try {
      const Tone = await loadTone()
      toneRef.current = Tone
      // Doit être déclenché par un geste utilisateur (le clic "Écouter") —
      // appelé ici comme première opération asynchrone du handler pour rester
      // dans la fenêtre autorisée par la politique autoplay des navigateurs.
      await Tone.start()
      build(Tone)

      // start()/stop() sur un Tone.Loop exigent un état "arrêté" avant de
      // redémarrer — inoffensif d'essayer stop() même si la boucle n'a encore
      // jamais tourné (premier "Écouter" de la session).
      try {
        loopRef.current?.stop(0)
      } catch (e) {
        // no-op — la boucle n'avait pas encore démarré
      }
      Tone.Transport.stop()
      Tone.Transport.position = 0
      loopRef.current?.start(0)
      Tone.Transport.start()
      setPlaying(true)
    } catch (e) {
      console.warn("[bg-music] impossible de démarrer la musique de fond —", e)
    }
  }, [build])

  const pause = useCallback(() => {
    if (!toneRef.current) return
    toneRef.current.Transport.pause()
    setPlaying(false)
  }, [])

  const resume = useCallback(() => {
    if (!toneRef.current) return
    toneRef.current.Transport.start()
    setPlaying(true)
  }, [])

  const stop = useCallback(() => {
    if (!toneRef.current) return
    toneRef.current.Transport.stop()
    setPlaying(false)
  }, [])

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      if (volumeNodeRef.current) {
        volumeNodeRef.current.volume.value = next ? BACKGROUND_VOLUME_DB : -Infinity
      }
      return next
    })
  }, [])

  // Précharge le script Tone.js dès que l'onglet Musique est monté (avant tout
  // clic) pour que le premier "Écouter" n'ait pas à attendre le téléchargement
  // — Tone.start() (qui doit rester dans la fenêtre du geste utilisateur) a
  // ainsi de bien meilleures chances de s'exécuter sans délai perceptible.
  useEffect(() => {
    loadTone().catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      try {
        loopRef.current?.dispose()
        volumeNodeRef.current?.dispose()
        toneRef.current?.Transport.stop()
      } catch (e) {
        // no-op — le contexte audio peut déjà avoir été nettoyé
      }
    }
  }, [])

  return { start, pause, resume, stop, toggleEnabled, enabled, playing }
}
