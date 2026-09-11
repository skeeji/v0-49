"use client"

import styles from "../coach.module.css"
import { useFavorites } from "../hooks/useFavorites"
import { speak } from "../hooks/useSpeech"

// Fiche mémo : les phrases mises en coeur depuis Musique, regroupées dans une
// vue à part — compacte, imprimable (voir .printArea dans coach.module.css),
// pour un dernier coup d'oeil avant de partir sans devoir renaviguer entre
// les thèmes de Musique. Alimentée uniquement par les favoris (aucune
// sélection automatique) : voir useFavorites.
const READ_VOICE = "en-GB-SoniaNeural"

export function MemoSheetSession() {
  const { favorites, loaded, removeFavorite } = useFavorites()

  if (!loaded) {
    return <div className={styles.loading}>Chargement de la fiche mémo…</div>
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.muted} style={{ fontSize: 13 }}>
        Aucune phrase épinglée pour l'instant. Dans l'onglet Musique, appuie sur 🤍 à côté d'une phrase en cours
        d'écoute pour l'ajouter ici.
      </div>
    )
  }

  return (
    <div>
      <div className={styles.rowLeft} style={{ marginBottom: 14, justifyContent: "space-between" }}>
        <div className={styles.muted} style={{ fontSize: 13 }}>
          {favorites.length} phrase{favorites.length > 1 ? "s" : ""} épinglée{favorites.length > 1 ? "s" : ""} depuis Musique (🤍).
        </div>
        <button className={`${styles.action} ${styles.primary}`} onClick={() => window.print()}>
          🖨️ Imprimer
        </button>
      </div>

      <div className={`${styles.memoList} print-area`}>
        {favorites.map((item) => (
          <div key={item.id} className={styles.memoItem}>
            <div className={styles.memoItemText}>
              <div className={styles.memoItemFr}>{item.fr}</div>
              <div className={styles.memoItemEn}>{item.en}</div>
              <div className={styles.memoItemTip}>{item.tip}</div>
            </div>
            <div className={`${styles.memoItemActions} print-hide`}>
              <button className={styles.action} onClick={() => speak(item.en, READ_VOICE)} title="Écouter">
                🔊
              </button>
              <button className={styles.action} onClick={() => removeFavorite(item.id)} title="Retirer">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
