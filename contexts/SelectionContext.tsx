"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

export interface SelectedLuminaire {
  id: string
  imageId?: string
  imageUrl: string
  nom: string
  artiste: string
  // Only manual fields - dimensions/materials come from server CSV
  prixHT?: string
  puissance?: string
}

interface SelectionContextType {
  selection: SelectedLuminaire[]
  clientName: string
  setClientName: (name: string) => void
  addToSelection: (luminaire: SelectedLuminaire) => void
  removeFromSelection: (id: string) => void
  updateLuminaire: (id: string, updates: Partial<SelectedLuminaire>) => void
  clearSelection: () => void
  isInSelection: (id: string) => boolean
  isSelectionOpen: boolean
  setIsSelectionOpen: (open: boolean) => void
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined)

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<SelectedLuminaire[]>([])
  const [clientName, setClientName] = useState("")
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)

  const addToSelection = useCallback((luminaire: SelectedLuminaire) => {
    setSelection((prev) => {
      if (prev.some((item) => item.id === luminaire.id)) {
        return prev
      }
      return [...prev, luminaire]
    })
  }, [])

  const removeFromSelection = useCallback((id: string) => {
    setSelection((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateLuminaire = useCallback((id: string, updates: Partial<SelectedLuminaire>) => {
    setSelection((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelection([])
    setClientName("")
  }, [])

  const isInSelection = useCallback(
    (id: string) => selection.some((item) => item.id === id),
    [selection]
  )

  return (
    <SelectionContext.Provider
      value={{
        selection,
        clientName,
        setClientName,
        addToSelection,
        removeFromSelection,
        updateLuminaire,
        clearSelection,
        isInSelection,
        isSelectionOpen,
        setIsSelectionOpen,
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider")
  }
  return context
}
