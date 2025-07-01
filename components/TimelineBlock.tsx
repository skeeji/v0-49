"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Edit2, Save, X, ExternalLink } from "lucide-react"
import Link from "next/link"

interface TimelineBlockProps {
  period: {
    name: string
    start: number
    end: number
    description: string
    luminaires: any[]
    imageUrl?: string
  }
  isLeft: boolean
  className?: string
  onDescriptionUpdate?: (periodName: string, newDescription: string) => void
}

export function TimelineBlock({ period, isLeft, className, onDescriptionUpdate }: TimelineBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(period.description)

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % period.luminaires.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + period.luminaires.length) % period.luminaires.length)
  }

  const handleSaveDescription = () => {
    if (onDescriptionUpdate) {
      onDescriptionUpdate(period.name, editedDescription)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedDescription(period.description)
    setIsEditing(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Point sur la timeline */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-20"></div>

      {/* Contenu principal */}
      <div className={`flex ${isLeft ? "justify-start" : "justify-end"} mb-8`}>
        <div className={`w-full max-w-2xl ${isLeft ? "pr-8" : "pl-8"}`}>
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* En-tête de la période */}
              <div className="mb-6">
                <h2 className="text-3xl font-serif text-gray-900 mb-2">{period.name}</h2>
                <p className="text-lg text-orange-600 font-medium">
                  {period.start} - {period.end}
                </p>
                <p className="text-sm text-gray-500 mt-1">{period.luminaires.length} luminaires</p>
              </div>

              {/* Image de période si disponible */}
              {period.imageUrl && (
                <div className="mb-6">
                  <img
                    src={period.imageUrl || "/placeholder.svg"}
                    alt={`Illustration ${period.name}`}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Description</h3>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-gray-500 hover:text-orange-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleSaveDescription} className="text-green-600">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-red-600">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[100px] resize-none"
                    placeholder="Description de la période..."
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">{period.description}</p>
                )}
              </div>

              {/* Carrousel des luminaires */}
              {period.luminaires.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Luminaires de cette période</h3>

                  <div className="relative">
                    {/* Luminaire actuel */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex gap-4">
                        {/* Image du luminaire */}
                        <div className="flex-shrink-0">
                          {period.luminaires[currentIndex].image ? (
                            <img
                              src={period.luminaires[currentIndex].image || "/placeholder.svg"}
                              alt={period.luminaires[currentIndex].name}
                              className="w-24 h-24 object-cover rounded-lg shadow-sm"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Pas d'image</span>
                            </div>
                          )}
                        </div>

                        {/* Informations du luminaire */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{period.luminaires[currentIndex].name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{period.luminaires[currentIndex].artist}</p>
                          {period.luminaires[currentIndex].year && (
                            <p className="text-sm text-orange-600 mt-1">
                              Année: {period.luminaires[currentIndex].year}
                            </p>
                          )}
                          <Link
                            href={`/luminaires/${period.luminaires[currentIndex].id}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                          >
                            Voir détails <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Navigation du carrousel */}
                    {period.luminaires.length > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={prevSlide}
                          disabled={period.luminaires.length <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {currentIndex + 1} / {period.luminaires.length}
                          </span>
                          <div className="flex gap-1">
                            {period.luminaires.slice(0, 5).map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  index === currentIndex ? "bg-orange-500" : "bg-gray-300"
                                }`}
                              />
                            ))}
                            {period.luminaires.length > 5 && <span className="text-gray-400">...</span>}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={nextSlide}
                          disabled={period.luminaires.length <= 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
