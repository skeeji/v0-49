"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Calendar, User, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
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
  onDescriptionUpdate: (periodName: string, newDescription: string) => void
}

export function TimelineBlock({ period, isLeft, className = "", onDescriptionUpdate }: TimelineBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(period.description)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleSave = () => {
    onDescriptionUpdate(period.name, editedDescription)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedDescription(period.description)
    setIsEditing(false)
  }

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line - Toujours centrée */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-orange-200 to-orange-400 z-0"></div>

      {/* Timeline dot */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>

      {/* Container principal */}
      <div className="relative z-5">
        {/* Layout Desktop */}
        <div className="hidden lg:flex items-stretch gap-8">
          {/* Image à gauche si isLeft = true */}
          {period.imageUrl && isLeft && (
            <div className="w-80 flex-shrink-0 pr-8">
              <div className="h-full rounded-lg overflow-hidden shadow-lg">
                <img
                  src={period.imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}

          {/* Contenu principal */}
          <Card className={`flex-1 max-w-2xl ${isLeft ? "mr-8" : "ml-8"} shadow-lg hover:shadow-xl transition-shadow`}>
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

              {/* Luminaires - Carrousel */}
              {period.luminaires.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Luminaires de cette période
                  </h4>

                  <div className="relative">
                    {/* Flèche gauche */}
                    {period.luminaires.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md"
                        onClick={() => scrollCarousel("left")}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Carrousel */}
                    <div
                      ref={carouselRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide px-8"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {period.luminaires.map((luminaire, index) => (
                        <Link
                          key={luminaire.id || index}
                          href={`/luminaires/${luminaire.id}`}
                          className="flex-shrink-0 group cursor-pointer"
                        >
                          <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden mb-2">
                            {luminaire.image ? (
                              <img
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=128&width=128&text=Image+non+trouvée"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm w-32">
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
                        </Link>
                      ))}
                    </div>

                    {/* Flèche droite */}
                    {period.luminaires.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md"
                        onClick={() => scrollCarousel("right")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image à droite si isLeft = false */}
          {period.imageUrl && !isLeft && (
            <div className="w-80 flex-shrink-0 pl-8">
              <div className="h-full rounded-lg overflow-hidden shadow-lg">
                <img
                  src={period.imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Layout Mobile */}
        <div className="lg:hidden">
          {/* Image au-dessus sur mobile */}
          {period.imageUrl && (
            <div className="mb-6">
              <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
                <img
                  src={period.imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}

          {/* Contenu principal mobile */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
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

              {/* Luminaires - Carrousel mobile */}
              {period.luminaires.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Luminaires de cette période
                  </h4>

                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {period.luminaires.map((luminaire, index) => (
                      <Link
                        key={luminaire.id || index}
                        href={`/luminaires/${luminaire.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                      >
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden mb-2">
                          {luminaire.image ? (
                            <img
                              src={luminaire.image || "/placeholder.svg"}
                              alt={luminaire.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=96&width=96&text=Image+non+trouvée"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs w-24">
                          <p className="font-medium text-gray-900 truncate">{luminaire.name}</p>
                          {luminaire.year && <p className="text-gray-500 text-xs">{luminaire.year}</p>}
                        </div>
                      </Link>
                    ))}
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
