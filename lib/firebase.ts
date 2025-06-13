import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAEWW_7emydImzVV6FstgzBAS50jMnHiMo",
  authDomain: "gersaint-paris-livre.firebaseapp.com",
  projectId: "gersaint-paris-livre",
  storageBucket: "gersaint-paris-livre.appspot.com",
  messagingSenderId: "244281919483",
  appId: "1:244281919483:web:fa0d2d8af4e5a958e5ad5e",
  measurementId: "G-PEBELFT8NY",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)

export type UserRole = "admin" | "premium" | "free"

export interface UserData {
  email: string
  role: UserRole
  searchCount?: number
  lastSearchDate?: string
}
