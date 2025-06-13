import type { ObjectId } from "mongodb"

export interface WelcomeVideo {
  _id?: ObjectId
  title: string
  description: string
  videoPath: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
