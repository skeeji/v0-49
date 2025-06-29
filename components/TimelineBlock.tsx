"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit2, Save, X, Calendar, User, Lightbulb } from "lucide-react"

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
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-serif text-gray-900 mb-2">{period.name}</CardTitle>
                  <CardDescription className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {period.start} - {period.end}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  {period.luminaires.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px] resize-none"
                      placeholder="Description de la période..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-1" />
                        Sauvegarder
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <p className="text-gray-700 leading-relaxed">{period.description}</p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Luminaires */}
              {period.luminaires.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2 text-orange-500" />
                    Luminaires de cette période
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {period.luminaires.slice(0, 6).map((luminaire, index) => (
                      <div key={index} className="group cursor-pointer">
                        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={luminaire.image || "/placeholder.svg?height=150&width=150"}
                            alt={luminaire.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=150&width=150"
                            }}
                          />
                        </div>
                        <div className="text-xs">
                          <p className="font-medium text-gray-900 truncate">{luminaire.name}</p>
                          {luminaire.artist && (
                            <p className="text-gray-600 truncate flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {luminaire.artist}
                            </p>
                          )}
                          {luminaire.year && (
                            <p className="text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {luminaire.year}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {period.luminaires.length > 6 && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      ... et {period.luminaires.length - 6} autres luminaires
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
