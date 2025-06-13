export interface Luminaire {
  id: string
  name: string
  artist: string
  year: string
  specialty: string
  collaboration: string
  signed: string
  image: string
  filename: string
  dimensions: string
  estimation: string
  materials: string
  description?: string
  url?: string
}

export interface Designer {
  name: string
  image: string
  luminaires: Luminaire[]
  count: number
}

export interface Period {
  name: string
  start: number
  end: number
  luminaires: Luminaire[]
}
