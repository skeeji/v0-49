"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider, type UserData } from "@/lib/firebase"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  canSearch: boolean
  incrementSearchCount: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const auth = getFirebaseAuth()
  const db = getFirebaseDb()
  const googleProvider = getGoogleProvider()

  // Vérifier si l'utilisateur peut effectuer une recherche
  const canSearch = userData?.role === "admin" || userData?.role === "premium" || (userData?.searchCount || 0) < 3

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 Auth state changed:", user?.email || "No user")
      setUser(user)

      if (user && db) {
        try {
          // Charger les données utilisateur depuis Firestore
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData
            console.log("👤 User data loaded:", data)
            setUserData(data)
          } else {
            // Créer un nouveau document utilisateur
            const newUserData: UserData = {
              email: user.email || "",
              role: "free",
              searchCount: 0,
              lastSearchDate: new Date().toISOString().split("T")[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            await setDoc(userDocRef, {
              ...newUserData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })

            console.log("✅ New user created:", newUserData)
            setUserData(newUserData)
          }
        } catch (error) {
          console.error("❌ Error loading user data:", error)
          toast.error("Erreur lors du chargement des données utilisateur")
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, db])

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      toast.error("Firebase non configuré")
      return
    }

    try {
      console.log("🚀 Starting Google sign in...")
      const result = await signInWithPopup(auth, googleProvider)
      console.log("✅ Google sign in successful:", result.user.email)
      toast.success(`Connecté en tant que ${result.user.email}`)
    } catch (error: any) {
      console.error("❌ Google sign in error:", error)

      // Messages d'erreur plus spécifiques
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Connexion annulée")
      } else if (error.code === "auth/popup-blocked") {
        toast.error("Popup bloquée par le navigateur")
      } else if (error.code === "auth/cancelled-popup-request") {
        toast.error("Demande de connexion annulée")
      } else {
        toast.error(`Erreur de connexion: ${error.message}`)
      }
    }
  }

  const signOut = async () => {
    if (!auth) return

    try {
      await firebaseSignOut(auth)
      console.log("👋 User signed out")
      toast.success("Déconnecté avec succès")
    } catch (error: any) {
      console.error("❌ Sign out error:", error)
      toast.error("Erreur lors de la déconnexion")
    }
  }

  const incrementSearchCount = async (): Promise<boolean> => {
    if (!user || !db || !userData) return false

    // Les admins et premium ont des recherches illimitées
    if (userData.role === "admin" || userData.role === "premium") {
      return true
    }

    const today = new Date().toISOString().split("T")[0]
    const currentCount = userData.lastSearchDate === today ? userData.searchCount || 0 : 0

    if (currentCount >= 3) {
      toast.error("Limite de recherches quotidiennes atteinte (3/3)")
      return false
    }

    try {
      const userDocRef = doc(db, "users", user.uid)
      const newCount = currentCount + 1

      await updateDoc(userDocRef, {
        searchCount: newCount,
        lastSearchDate: today,
        updatedAt: serverTimestamp(),
      })

      // Mettre à jour l'état local
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              searchCount: newCount,
              lastSearchDate: today,
            }
          : null,
      )

      console.log(`🔍 Search count updated: ${newCount}/3`)
      return true
    } catch (error) {
      console.error("❌ Error updating search count:", error)
      toast.error("Erreur lors de la mise à jour du compteur")
      return false
    }
  }

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signInWithGoogle,
    signOut,
    canSearch,
    incrementSearchCount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
