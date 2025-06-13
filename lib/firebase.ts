import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

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

// Initialiser Firebase seulement si configuré
let app: any = null
let auth: any = null
let db: any = null
let storage: any = null
let googleProvider: any = null

if (isFirebaseConfigured) {
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

    console.log("🔥 Firebase initialized successfully")
    console.log("📊 Project ID:", firebaseConfig.projectId)
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error)
  }
} else {
  console.warn("⚠️ Firebase not configured - authentication will be disabled")
  console.log("To enable Firebase, set these environment variables:")
  console.log("- NEXT_PUBLIC_FIREBASE_API_KEY")
  console.log("- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
  console.log("- NEXT_PUBLIC_FIREBASE_PROJECT_ID")
}

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
