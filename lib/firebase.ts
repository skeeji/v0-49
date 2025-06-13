import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { env } from "./env"

// Configuration Firebase avec validation
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Vérifier que les variables critiques sont présentes
const requiredKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
]

const missingKeys = requiredKeys.filter((key) => !env[key])
if (missingKeys.length > 0) {
  console.error("❌ Firebase configuration missing:", missingKeys)
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(", ")}`)
}

// Initialiser Firebase
let app
let auth
let db
let storage
let googleProvider

try {
  // Initialiser l'app Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

  // Initialiser les services
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  googleProvider = new GoogleAuthProvider()

  // Configuration du provider Google
  googleProvider.setCustomParameters({
    prompt: "select_account",
  })

  // Mode développement - utiliser les émulateurs si disponibles
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    // Connecter aux émulateurs seulement en développement et côté client
    try {
      if (!auth.config.emulator) {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })
      }
    } catch (error) {
      // Émulateur Auth non disponible, continuer avec Firebase
    }

    try {
      if (!db._delegate._databaseId.projectId.includes("demo-")) {
        connectFirestoreEmulator(db, "localhost", 8080)
      }
    } catch (error) {
      // Émulateur Firestore non disponible, continuer avec Firebase
    }
  }

  console.log("🔥 Firebase initialized successfully")
  console.log("📊 Project ID:", firebaseConfig.projectId)
} catch (error) {
  console.error("❌ Firebase initialization failed:", error)
  throw error
}

export { auth, db, storage, googleProvider }
export type UserRole = "admin" | "premium" | "free"

export interface UserData {
  email: string
  role: UserRole
  searchCount?: number
  lastSearchDate?: string
  createdAt?: Date
  updatedAt?: Date
}

export default app
