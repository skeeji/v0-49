"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db, googleProvider, isFirebaseConfigured, type UserData } from "@/lib/firebase"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  canSearch: boolean
  incrementSearchCount: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  canSearch: true,
  incrementSearchCount: async () => true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Vérifier si l'utilisateur peut effectuer une recherche
  const canSearch = !user || userData?.role !== "free" || (userData?.searchCount || 0) < 3

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      console.warn("⚠️ Firebase not configured, skipping auth state listener")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔄 Auth state changed:", user ? `User: ${user.email}` : "No user")

      setUser(user)

      if (user) {
        try {
          await loadUserData(user.uid)
        } catch (error) {
          console.error("❌ Error loading user data:", error)
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadUserData = async (uid: string) => {
    if (!db) {
      console.warn("⚠️ Firestore not available")
      return
    }

    try {
      const userDocRef = doc(db, "users", uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData
        console.log("📊 User data loaded:", data)
        setUserData(data)
      } else {
        console.log("👤 Creating new user document")
        // Créer un nouveau document utilisateur
        const newUserData: UserData = {
          email: user?.email || "",
          role: "free",
          searchCount: 0,
          lastSearchDate: new Date().toISOString().split("T")[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await setDoc(userDocRef, newUserData)
        setUserData(newUserData)
        console.log("✅ New user document created")
      }
    } catch (error) {
      console.error("❌ Error in loadUserData:", error)
      toast.error("Erreur lors du chargement des données utilisateur")
    }
  }

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      toast.error("Authentification non configurée")
      return
    }

    try {
      console.log("🚀 Starting Google sign in...")

      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      console.log("✅ Google sign in successful:", user.email)
      toast.success(`Connexion réussie ! Bienvenue ${user.displayName || user.email}`)

      // Les données utilisateur seront chargées automatiquement par onAuthStateChanged
    } catch (error: any) {
      console.error("❌ Google sign in error:", error)

      let errorMessage = "Erreur lors de la connexion"

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Connexion annulée par l'utilisateur"
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup bloquée par le navigateur. Veuillez autoriser les popups."
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Demande de connexion annulée"
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Erreur réseau. Vérifiez votre connexion internet."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    }
  }

  const logout = async () => {
    if (!auth) {
      console.warn("⚠️ Auth not available")
      return
    }

    try {
      await signOut(auth)
      console.log("✅ User signed out")
      toast.success("Déconnexion réussie")
    } catch (error) {
      console.error("❌ Sign out error:", error)
      toast.error("Erreur lors de la déconnexion")
    }
  }

  const incrementSearchCount = async (): Promise<boolean> => {
    if (!user || !userData || !db) {
      return false
    }

    // Vérifier si c'est un nouvel jour
    const today = new Date().toISOString().split("T")[0]
    const lastSearchDate = userData.lastSearchDate || ""

    let currentSearchCount = userData.searchCount || 0

    // Réinitialiser le compteur si c'est un nouveau jour
    if (lastSearchDate !== today) {
      currentSearchCount = 0
    }

    // Vérifier la limite pour les utilisateurs gratuits
    if (userData.role === "free" && currentSearchCount >= 3) {
      toast.error("Limite de 3 recherches par jour atteinte. Passez à Premium pour des recherches illimitées.")
      return false
    }

    try {
      // Incrémenter le compteur
      const newSearchCount = currentSearchCount + 1
      const userDocRef = doc(db, "users", user.uid)

      await updateDoc(userDocRef, {
        searchCount: newSearchCount,
        lastSearchDate: today,
        updatedAt: new Date(),
      })

      // Mettre à jour l'état local
      setUserData({
        ...userData,
        searchCount: newSearchCount,
        lastSearchDate: today,
        updatedAt: new Date(),
      })

      console.log(`📊 Search count updated: ${newSearchCount}/3 for ${userData.role} user`)
      return true
    } catch (error) {
      console.error("❌ Error updating search count:", error)
      toast.error("Erreur lors de la mise à jour du compteur de recherches")
      return false
    }
  }

  const value = {
    user,
    userData,
    loading,
    signInWithGoogle,
    logout,
    canSearch,
    incrementSearchCount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
