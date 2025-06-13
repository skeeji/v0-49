import type { ObjectId } from "mongodb"

export interface Designer {
  _id?: ObjectId
  nom: string
  slug: string
  biographie: string
  dateNaissance?: string
  dateDeces?: string
  nationalite: string
  image?: string
  luminairesCount: number
  createdAt: Date
  updatedAt: Date
}
