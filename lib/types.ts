export interface Luminaire {
  _id?: string
  id?: string
  name: string
  designer: string
  year: number
  description: string
  category: string
  style: string
  materials: string[]
  dimensions: {
    height: number
    width: number
    depth: number
  }
  images: string[]
  price?: number
  availability: boolean
  tags: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface Designer {
  _id?: string
  id?: string
  name: string
  biography: string
  birthYear?: number
  deathYear?: number
  nationality: string
  style: string
  notableWorks: string[]
  image?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface TimelineEvent {
  _id?: string
  id?: string
  year: number
  title: string
  description: string
  category: "invention" | "style" | "designer" | "event"
  image?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface User {
  _id?: string
  id?: string
  email: string
  name: string
  role: "admin" | "user"
  createdAt?: Date
  updatedAt?: Date
}

export interface SearchFilters {
  category?: string
  style?: string
  designer?: string
  yearRange?: [number, number]
  materials?: string[]
  priceRange?: [number, number]
  availability?: boolean
}

export interface SortOption {
  field: string
  direction: "asc" | "desc"
}
