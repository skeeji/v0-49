"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { toast } from "react-toastify"
import Link from "next/link"

interface AuthContextType {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  searchCount: number
  incrementSearchCount: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchCount, setSearchCount] = useState(0)

  const login = () => {
    setIsAuthenticated(true)
  }

  const logout = () => {
    setIsAuthenticated(false)
  }

  const incrementSearchCount = () => {
    if (searchCount >= 3) {
      toast.error(
        <div>
          Limite de 3 recherches par jour atteinte.{" "}
          <Link href="/pricing" className="underline font-medium">
            Passez à Premium
          </Link>{" "}
          pour des recherches illimitées.
        </div>,
      )
    } else {
      setSearchCount(searchCount + 1)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, searchCount, incrementSearchCount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
