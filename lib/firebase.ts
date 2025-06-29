import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Configuration Firebase avec vos vraies valeurs
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAEWW_7emydImzVV6FstgzBAS50jMnHiMo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gersaint-paris-livre.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gersaint-paris-livre",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gersaint-paris-livre.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "244281919483",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:244281919483:web:fa0d2d8af4e5a958e5ad5e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PEBELFT8NY",
}

// Vérifier que les variables critiques sont présentes
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.authDomain !== "undefined" &&
  firebaseConfig.projectId !== "undefined"
)

// Variables pour les services Firebase
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let googleProvider: GoogleAuthProvider | null = null

// Fonction pour initialiser Firebase de manière sécurisée
const initializeFirebase = () => {
  if (!isFirebaseConfigured) {
    console.warn("⚠️ Firebase not configured - authentication will be disabled")
    console.log("To enable Firebase, set these environment variables:")
    console.log("- NEXT_PUBLIC_FIREBASE_API_KEY")
    console.log("- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
    console.log("- NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    return false
  }

  try {
    // Initialiser l'app Firebase seulement si elle n'existe pas déjà
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    }

    // Initialiser les services seulement après que l'app soit prête
    if (app && !auth) {
      auth = getAuth(app)
    }

    if (app && !db) {
      db = getFirestore(app)
    }

    if (app && !storage) {
      storage = getStorage(app)
    }

    if (!googleProvider) {
      googleProvider = new GoogleAuthProvider()
      googleProvider.setCustomParameters({
        prompt: "select_account",
      })
    }

    console.log("🔥 Firebase initialized successfully")
    console.log("📊 Project ID:", firebaseConfig.projectId)
    return true
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error)
    return false
  }
}

// Initialiser côté client uniquement
if (typeof window !== "undefined") {
  initializeFirebase()
}

// Fonctions getter sécurisées
export const getFirebaseAuth = () => {
  if (typeof window === "undefined") return null
  if (!auth && isFirebaseConfigured) {
    initializeFirebase()
  }
  return auth
}

export const getFirebaseDb = () => {
  if (typeof window === "undefined") return null
  if (!db && isFirebaseConfigured) {
    initializeFirebase()
  }
  return db
}

export const getFirebaseStorage = () => {
  if (typeof window === "undefined") return null
  if (!storage && isFirebaseConfigured) {
    initializeFirebase()
  }
  return storage
}

export const getGoogleProvider = () => {
  if (typeof window === "undefined") return null
  if (!googleProvider && isFirebaseConfigured) {
    initializeFirebase()
  }
  return googleProvider
}

// Exports pour compatibilité
export { auth, db, storage, googleProvider, isFirebaseConfigured }

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
