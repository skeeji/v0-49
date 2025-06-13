"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db, googleProvider, type UserData } from "@/lib/firebase"
import { useToast } from "@/hooks/useToast"

// Mode développement désactivé
const DEV_MODE = false

interface AuthContextType {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  incrementSearchCount: () => Promise<boolean>
  canSearch: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canSearch, setCanSearch] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    // Configurer la persistance locale pour éviter les déconnexions fréquentes
    setPersistence(auth, browserLocalPersistence).catch(console.error)

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData
            setUserData(userData)

            // Check search limits for free users
            if (userData.role === "free") {
              const today = new Date().toISOString().split("T")[0]
              if (userData.lastSearchDate === today && (userData.searchCount || 0) >= 3) {
                setCanSearch(false)
              } else {
                setCanSearch(true)
              }
            }
          } else {
            // Create new user document if it doesn't exist
            const newUserData: UserData = {
              email: currentUser.email || "",
              role: "free",
            }
            await setDoc(userDocRef, newUserData)
            setUserData(newUserData)
            setCanSearch(true)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          showToast("Erreur lors de la récupération des données utilisateur", "error")
        }
      } else {
        setUserData(null)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [showToast])

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      await signInWithPopup(auth, googleProvider)
      showToast("Connexion réussie", "success")
    } catch (error) {
      console.error("Error signing in with Google:", error)

      // Message d'erreur plus explicite
      if (error.code === "auth/unauthorized-domain") {
        showToast(
          "Erreur: Ce domaine n'est pas autorisé dans Firebase. Veuillez configurer votre projet Firebase.",
          "error",
        )
      } else {
        showToast("Erreur lors de la connexion", "error")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      showToast("Déconnexion réussie", "success")
    } catch (error) {
      console.error("Error signing out:", error)
      showToast("Erreur lors de la déconnexion", "error")
    }
  }

  const incrementSearchCount = async (): Promise<boolean> => {
    if (!user || !userData) return false

    // Admin and premium users don't have search limits
    if (userData.role !== "free") return true

    try {
      const today = new Date().toISOString().split("T")[0]
      const userDocRef = doc(db, "users", user.uid)

      // Check if user has reached daily limit
      if (userData.lastSearchDate === today && (userData.searchCount || 0) >= 3) {
        showToast("Limite de recherches quotidiennes atteinte (3/3)", "error")
        setCanSearch(false)
        return false
      }

      // Update search count
      const newCount = userData.lastSearchDate === today ? (userData.searchCount || 0) + 1 : 1
      const updatedUserData = {
        ...userData,
        searchCount: newCount,
        lastSearchDate: today,
      }

      await setDoc(userDocRef, updatedUserData, { merge: true })
      setUserData(updatedUserData)

      // Check if this was the last allowed search
      if (newCount >= 3) {
        setCanSearch(false)
        showToast(`Dernière recherche utilisée (3/3)`, "info")
      } else {
        showToast(`Recherche utilisée (${newCount}/3)`, "info")
      }

      return true
    } catch (error) {
      console.error("Error updating search count:", error)
      showToast("Erreur lors de la mise à jour du compteur de recherches", "error")
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isLoading,
        signInWithGoogle,
        logout,
        incrementSearchCount,
        canSearch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
