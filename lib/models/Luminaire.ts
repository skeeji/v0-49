import type { ObjectId } from "mongodb"

export interface Luminaire {
  _id?: ObjectId
  nom: string
  designer: string
  annee: number
  periode: string
  description: string
  materiaux: string[]
  couleurs: string[]
  dimensions: {
    hauteur?: number
    largeur?: number
    profondeur?: number
  }
  images: string[]
  isFavorite?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LuminaireFilter {
  search?: string
  designer?: string
  periode?: string
  materiaux?: string[]
  couleurs?: string[]
  anneeMin?: number
  anneeMax?: number
  isFavorite?: boolean
}

export interface LuminaireSortOptions {
  field: "nom" | "designer" | "annee" | "createdAt"
  direction: "asc" | "desc"
}
