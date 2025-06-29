"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Calendar, User, ImageIcon } from "lucide-react"

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
  const [showAllLuminaires, setShowAllLuminaires] = useState(false)

  const handleSave = () => {
    onDescriptionUpdate(period.name, editedDescription)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedDescription(period.description)
    setIsEditing(false)
  }

  const displayedLuminaires = showAllLuminaires ? period.luminaires : period.luminaires.slice(0, 6)

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-orange-200 to-orange-400"></div>

      {/* Timeline dot */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>

      {/* Content */}
      <div className={`flex ${isLeft ? "justify-start pr-8" : "justify-end pl-8"}`}>
        <Card className={`w-full max-w-2xl ${isLeft ? "mr-8" : "ml-8"} shadow-lg hover:shadow-xl transition-shadow`}>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-serif text-gray-900 mb-1">{period.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {period.start} - {period.end}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {period.luminaires.length} luminaires
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Description */}
            <div className="mb-6">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Description de la période..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Sauvegarder
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">{period.description}</p>
              )}
            </div>

            {/* Luminaires */}
            {period.luminaires.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Luminaires de cette période
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {displayedLuminaires.map((luminaire, index) => (
                    <div key={luminaire.id || index} className="group cursor-pointer">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                        {luminaire.image ? (
                          <img
                            src={luminaire.image || "/placeholder.svg"}
                            alt={luminaire.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=200&width=200&text=Image+non+trouvée"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 truncate">{luminaire.name}</p>
                        {luminaire.artist && (
                          <p className="text-gray-600 truncate flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {luminaire.artist}
                          </p>
                        )}
                        {luminaire.year && (
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {luminaire.year}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {period.luminaires.length > 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllLuminaires(!showAllLuminaires)}
                    className="w-full"
                  >
                    {showAllLuminaires ? "Voir moins" : `Voir tous les ${period.luminaires.length} luminaires`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
