"use client"

// Bundle UMD officiel de Tone.js, chargé à la demande via une balise <script>
// plutôt qu'un import npm — évite de toucher au package.json racine du site
// (hors du périmètre de cette page), même pattern que le SDK Azure Speech
// (voir useSpeech.ts). Partagé entre useBackgroundMusic (boucle de fond) et
// useVocabPlayer (clips FR/EN) : les deux utilisent le même AudioContext Tone
// global, chargé une seule fois.
const TONE_CDN_URL = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js"

let tonePromise: Promise<any> | null = null

export function loadTone(): Promise<any> {
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
