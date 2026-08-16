"use client"

import { useEffect, useRef } from "react"

// Empêche l'écran (surtout mobile) de se mettre en veille tant que `active`
// reste vrai — cartes, jeu de rôle, appel et musique sont des sessions qu'on
// suit à l'oreille/au regard sans forcément toucher l'écran, la mise en veille
// automatique du téléphone les interromprait sinon. Repose sur l'API native
// Screen Wake Lock (Chrome/Edge/Safari récents) ; si l'API est absente le hook
// ne fait rien silencieusement — la page se comporte comme avant.
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<any>(null)

  useEffect(() => {
    if (!active) return
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return

    let cancelled = false

    const request = async () => {
      try {
        const sentinel = await (navigator as any).wakeLock.request("screen")
        if (cancelled) {
          sentinel.release().catch(() => {})
          return
        }
        sentinelRef.current = sentinel
      } catch (e) {
        // no-op — refusé (onglet en arrière-plan, batterie faible, navigateur
        // sans support...) : la page continue de fonctionner sans le verrou.
        console.warn("[wake-lock] indisponible —", e)
      }
    }

    request()

    // Le verrou est automatiquement relâché par le navigateur dès que l'onglet
    // passe en arrière-plan (changement d'appli, écran déjà verrouillé côté
    // OS) — on le redemande donc à chaque retour au premier plan tant que ce
    // hook reste actif.
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        request()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", handleVisibility)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [active])
}
