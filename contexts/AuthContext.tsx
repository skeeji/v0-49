"use client"

import { createContext, useState, useEffect, useContext, type ReactNode } from "react"
import { getFirebaseAuth, getGoogleProvider, getFirebaseDb, type UserData } from "@/lib/firebase"
import { signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface AuthContextProps {
  user: FirebaseUser | null
  userData: UserData | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const auth = getFirebaseAuth()
    const db = getFirebaseDb()

    if (!auth || !db) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userDocRef = doc(db, "users", authUser.uid)
          const docSnap = await getDoc(userDocRef)

          if (docSnap.exists()) {
            // L'utilisateur existe déjà dans Firestore
            const existingUserData = docSnap.data() as UserData
            setUserData(existingUserData)
          } else {
            // L'utilisateur n'existe pas, on le crée avec le rôle par défaut
            const newUser: UserData = {
              email: authUser.email || "",
              role: "free",
            }
            await setDoc(userDocRef, newUser)
            setUserData(newUser)
          }

          setUser(authUser)
        } catch (error: any) {
          console.error("Erreur lors de la récupération des données utilisateur:", error)
          toast({
            title: "Erreur",
            description: "Erreur lors de la récupération des données utilisateur.",
            type: "error",
          })
        } finally {
          setLoading(false)
        }
      } else {
        setUser(null)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [toast])

  const login = async () => {
    const auth = getFirebaseAuth()
    const provider = getGoogleProvider()
    const db = getFirebaseDb()

    if (!auth || !provider || !db) {
      toast({
        title: "Erreur",
        description: "Firebase n'est pas correctement initialisé.",
        type: "error",
      })
      return
    }

    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Vérifier si l'utilisateur existe dans Firestore
      const userDocRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(userDocRef)

      if (docSnap.exists()) {
        // L'utilisateur existe déjà dans Firestore
        const existingUserData = docSnap.data() as UserData
        setUserData(existingUserData)
      } else {
        // L'utilisateur n'existe pas, on le crée avec le rôle par défaut
        const newUser: UserData = {
          email: user.email || "",
          role: "free",
        }
        await setDoc(userDocRef, newUser)
        setUserData(newUser)
      }

      setUser(user)
      toast({
        title: "Connexion réussie",
        description: "Vous êtes connecté(e) !",
        type: "success",
      })
    } catch (error: any) {
      console.error("Erreur lors de la connexion:", error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la connexion.",
        type: "error",
      })
    }
  }

  const logout = async () => {
    const auth = getFirebaseAuth()

    if (!auth) {
      toast({
        title: "Erreur",
        description: "Firebase n'est pas correctement initialisé.",
        type: "error",
      })
      return
    }

    try {
      await signOut(auth)
      setUser(null)
      setUserData(null)
      toast({
        title: "Déconnexion réussie",
        description: "Vous êtes déconnecté(e).",
        type: "success",
      })
    } catch (error: any) {
      console.error("Erreur lors de la déconnexion:", error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion.",
        type: "error",
      })
    }
  }

  return <AuthContext.Provider value={{ user, userData, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
