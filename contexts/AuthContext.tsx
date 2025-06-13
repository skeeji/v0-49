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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, googleProvider, isFirebaseConfigured, type UserData } from "@/lib/firebase"
import { useToast } from "@/hooks/useToast"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  incrementSearchCount: () => Promise<boolean>
  canSearch: boolean
  isFirebaseEnabled: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canSearch, setCanSearch] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    // Si Firebase n'est pas configuré, utiliser un mode dégradé
    if (!isFirebaseConfigured || !auth || !db) {
      console.warn("⚠️ Firebase not available - using offline mode")
      setIsLoading(false)
      setCanSearch(true)
      return
    }

    // Configurer la persistance locale
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn("⚠️ Could not set auth persistence:", error)
    })

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("🔄 Auth state changed:", currentUser?.email || "No user")
      setUser(currentUser)

      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData
            setUserData(userData)
            console.log("👤 User data loaded:", userData.email, userData.role)

            // Vérifier les limites de recherche pour les utilisateurs gratuits
            if (userData.role === "free") {
              const today = new Date().toISOString().split("T")[0]
              if (userData.lastSearchDate === today && (userData.searchCount || 0) >= 3) {
                setCanSearch(false)
              } else {
                setCanSearch(true)
              }
            } else {
              setCanSearch(true)
            }
          } else {
            // Créer un nouveau document utilisateur
            const newUserData: UserData = {
              email: currentUser.email || "",
              role: "free",
              searchCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            await setDoc(userDocRef, {
              ...newUserData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })

            setUserData(newUserData)
            setCanSearch(true)
            console.log("✅ New user created:", newUserData.email)
          }
        } catch (error) {
          console.error("❌ Error fetching user data:", error)

          // Gestion spécifique des erreurs Firebase
          if (error.code === "unavailable") {
            showToast("Service temporairement indisponible. Veuillez réessayer.", "error")
          } else if (error.code === "permission-denied") {
            showToast("Permissions insuffisantes. Contactez l'administrateur.", "error")
          } else {
            showToast("Erreur lors de la récupération des données utilisateur", "error")
          }

          // Permettre l'utilisation basique même en cas d'erreur
          setUserData({
            email: currentUser.email || "",
            role: "free",
            searchCount: 0,
          })
          setCanSearch(true)
        }
      } else {
        setUserData(null)
        setCanSearch(true)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [showToast])

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      showToast("Authentification non configurée. Contactez l'administrateur.", "error")
      return
    }

    if (!auth || !googleProvider) {
      showToast("Service d'authentification non disponible", "error")
      return
    }

    try {
      setIsLoading(true)
      console.log("🔄 Starting Google sign in...")

      const result = await signInWithPopup(auth, googleProvider)
      console.log("✅ Google sign in successful:", result.user.email)

      showToast("Connexion réussie", "success")
    } catch (error) {
      console.error("❌ Error signing in with Google:", error)

      // Gestion détaillée des erreurs
      if (error.code === "auth/unauthorized-domain") {
        showToast("Domaine non autorisé. Veuillez configurer Firebase Console.", "error")
      } else if (error.code === "auth/popup-blocked") {
        showToast("Popup bloquée. Autorisez les popups pour ce site.", "error")
      } else if (error.code === "auth/popup-closed-by-user") {
        showToast("Connexion annulée", "info")
      } else if (error.code === "auth/network-request-failed") {
        showToast("Erreur réseau. Vérifiez votre connexion.", "error")
      } else {
        showToast("Erreur lors de la connexion. Veuillez réessayer.", "error")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (!isFirebaseConfigured || !auth) {
      showToast("Service d'authentification non disponible", "error")
      return
    }

    try {
      await signOut(auth)
      showToast("Déconnexion réussie", "success")
      console.log("✅ User signed out")
    } catch (error) {
      console.error("❌ Error signing out:", error)
      showToast("Erreur lors de la déconnexion", "error")
    }
  }

  const incrementSearchCount = async (): Promise<boolean> => {
    // Si Firebase n'est pas configuré, permettre les recherches illimitées
    if (!isFirebaseConfigured) {
      return true
    }

    if (!user || !userData || !db) return false

    // Les utilisateurs admin et premium n'ont pas de limites
    if (userData.role !== "free") return true

    try {
      const today = new Date().toISOString().split("T")[0]
      const userDocRef = doc(db, "users", user.uid)

      // Vérifier si l'utilisateur a atteint la limite quotidienne
      if (userData.lastSearchDate === today && (userData.searchCount || 0) >= 3) {
        showToast("Limite de recherches quotidiennes atteinte (3/3)", "error")
        setCanSearch(false)
        return false
      }

      // Mettre à jour le compteur de recherches
      const newCount = userData.lastSearchDate === today ? (userData.searchCount || 0) + 1 : 1
      const updatedUserData = {
        ...userData,
        searchCount: newCount,
        lastSearchDate: today,
        updatedAt: new Date(),
      }

      await setDoc(
        userDocRef,
        {
          ...updatedUserData,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      setUserData(updatedUserData)

      // Vérifier si c'était la dernière recherche autorisée
      if (newCount >= 3) {
        setCanSearch(false)
        showToast(`Dernière recherche utilisée (3/3)`, "info")
      } else {
        showToast(`Recherche utilisée (${newCount}/3)`, "info")
      }

      return true
    } catch (error) {
      console.error("❌ Error updating search count:", error)
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
        isFirebaseEnabled: isFirebaseConfigured,
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
