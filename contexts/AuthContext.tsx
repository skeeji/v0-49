"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from "firebase/auth"
import { toast } from "sonner"

interface UserData {
  uid: string
  email: string
  displayName: string
  role: "free" | "premium" | "admin"
  searchCount: number
  lastSearchReset: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  incrementSearchCount: () => Promise<boolean>
  canSearch: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Vérifier si l'utilisateur peut faire des recherches (3 par mois pour les comptes gratuits)
  const canSearch = userData?.role !== "free" || (userData?.searchCount || 0) < 3

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Charger ou créer les données utilisateur
        const storedData = localStorage.getItem(`userData_${user.uid}`)
        let userData: UserData

        if (storedData) {
          userData = JSON.parse(storedData)

          // CORRECTION: Vérifier si on doit réinitialiser le compteur mensuel
          const now = new Date()
          const lastReset = new Date(userData.lastSearchReset)
          const monthsDiff =
            (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth())

          if (monthsDiff >= 1) {
            userData.searchCount = 0
            userData.lastSearchReset = now.toISOString()
            localStorage.setItem(`userData_${user.uid}`, JSON.stringify(userData))
          }
        } else {
          // Créer un nouveau profil utilisateur
          userData = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: "free",
            searchCount: 0,
            lastSearchReset: new Date().toISOString(),
          }
          localStorage.setItem(`userData_${user.uid}`, JSON.stringify(userData))
        }

        setUserData(userData)
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success("Connexion réussie!")
    } catch (error) {
      console.error("Erreur de connexion:", error)
      toast.error("Erreur lors de la connexion")
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      toast.success("Déconnexion réussie!")
    } catch (error) {
      console.error("Erreur de déconnexion:", error)
      toast.error("Erreur lors de la déconnexion")
    }
  }

  const incrementSearchCount = async (): Promise<boolean> => {
    if (!user || !userData) return false

    if (userData.role !== "free") {
      return true // Pas de limite pour les utilisateurs premium/admin
    }

    if (userData.searchCount >= 3) {
      toast.error("Limite de 3 recherches par mois atteinte. Passez à Premium pour des recherches illimitées.")
      return false
    }

    const newUserData = {
      ...userData,
      searchCount: userData.searchCount + 1,
    }

    setUserData(newUserData)
    localStorage.setItem(`userData_${user.uid}`, JSON.stringify(newUserData))

    return true
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
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
