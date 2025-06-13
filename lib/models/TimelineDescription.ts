import type { ObjectId } from "mongodb"

export interface TimelineDescription {
  _id?: ObjectId
  periode: string
  description: string
  createdAt: Date
  updatedAt: Date
}
