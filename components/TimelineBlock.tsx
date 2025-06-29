"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit2, Save, X, Calendar, User } from "lucide-react"

interface TimelineBlockProps {
  period: {
    name: string
    start: number
    end: number
    description: string
    luminaires: any[]
  }
  isLeft: boolean
  className?: string
  onDescriptionUpdate: (periodName: string, newDescription: string) => void
}

export function TimelineBlock({ period, isLeft, className = "", onDescriptionUpdate }: TimelineBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(period.description)

  const handleSave = () => {
    onDescriptionUpdate(period.name, editedDescription)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedDescription(period.description)
    setIsEditing(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Ligne de temps */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-orange-400 to-orange-600 h-full"></div>

      {/* Point sur la ligne de temps */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>

      {/* Contenu */}
      <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
        <div className={`w-full max-w-2xl ${isLeft ? "pr-8" : "pl-8"}`}>
          <Card className="bg-white shadow-xl border-0 overflow-hidden">
            <CardContent className="p-8">
              {/* En-tête de la période */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-serif text-gray-900 mb-2">{period.name}</h3>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {period.start} - {period.end}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{period.luminaires.length} luminaires</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Description */}
              <div className="mb-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px] resize-none"
                      placeholder="Description de la période..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Sauvegarder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex items-center gap-2 bg-transparent"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed">{period.description}</p>
                )}
              </div>

              {/* Grille des luminaires */}
              {period.luminaires.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Luminaires de cette période
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {period.luminaires.slice(0, 8).map((luminaire, index) => (
                      <Link key={luminaire.id || index} href={`/luminaires/${luminaire.id}`}>
                        <div className="group cursor-pointer">
                          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
                            <Image
                              src={luminaire.image || "/placeholder.svg?height=150&width=150"}
                              alt={luminaire.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=150&width=150"
                              }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900 truncate">{luminaire.name}</p>
                            <p className="text-xs text-gray-600 truncate">{luminaire.artist}</p>
                            {luminaire.year && <p className="text-xs text-orange-600 font-medium">{luminaire.year}</p>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {period.luminaires.length > 8 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Et {period.luminaires.length - 8} autres luminaires de cette période...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {period.luminaires.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun luminaire pour cette période</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
