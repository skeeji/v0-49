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
  canEdit?: boolean
}

export function TimelineBlock({
  period,
  isLeft,
  className = "",
  onDescriptionUpdate,
  canEdit = false,
}: TimelineBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(period.description)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleSave = () => {
    if (!canEdit) return
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
      {/* Container principal */}
      <div className="relative z-5">
        {/* Layout Desktop */}
        <div className="hidden lg:flex items-stretch gap-8 min-h-[500px]">
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
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-serif text-gray-900 mb-1">{period.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-serif">
                      {period.start} - {period.end}
                    </span>
                    <Badge variant="secondary" className="ml-2 font-serif">
                      {period.luminaires.length} luminaires
                    </Badge>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                {isEditing && canEdit ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px] font-serif"
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
                  <p className="text-gray-700 leading-relaxed font-serif">{period.description}</p>
                )}
              </div>

              {/* Luminaires - Slider horizontal */}
              {period.luminaires.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2 font-serif">
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

                    {/* Slider horizontal */}
                    <div
                      ref={carouselRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide px-8 pb-2"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {period.luminaires.map((luminaire, index) => (
                        <Link
                          key={luminaire.id || index}
                          href={`/luminaires/${luminaire.id}`}
                          className="flex-shrink-0 group cursor-pointer"
                        >
                          <div className="w-40 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3">
                            <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                              {luminaire.image ? (
                                <img
                                  src={luminaire.image || "/placeholder.svg"}
                                  alt={luminaire.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg?height=128&width=160&text=Image+non+trouvée"
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-gray-900 line-clamp-2 mb-1 font-serif">{luminaire.name}</p>
                              {luminaire.artist && (
                                <p className="text-gray-600 text-xs line-clamp-1 flex items-center gap-1 mb-1 font-serif">
                                  <User className="w-3 h-3" />
                                  {luminaire.artist}
                                </p>
                              )}
                              {luminaire.year && (
                                <p className="text-orange-600 text-xs flex items-center gap-1 font-serif">
                                  <Calendar className="w-3 h-3" />
                                  {luminaire.year}
                                </p>
                              )}
                            </div>
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
                    <span className="font-serif">
                      {period.start} - {period.end}
                    </span>
                    <Badge variant="secondary" className="ml-2 font-serif">
                      {period.luminaires.length} luminaires
                    </Badge>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                {isEditing && canEdit ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px] font-serif"
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
                  <p className="text-gray-700 leading-relaxed font-serif">{period.description}</p>
                )}
              </div>

              {/* Luminaires - Slider mobile */}
              {period.luminaires.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2 font-serif">
                    <ImageIcon className="w-5 h-5" />
                    Luminaires de cette période
                  </h4>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {period.luminaires.map((luminaire, index) => (
                      <Link
                        key={luminaire.id || index}
                        href={`/luminaires/${luminaire.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                      >
                        <div className="w-28 bg-white rounded-lg shadow-sm p-2">
                          <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden mb-2">
                            {luminaire.image ? (
                              <img
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=96&width=112&text=Image+non+trouvée"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs">
                            <p className="font-medium text-gray-900 line-clamp-2 mb-1 font-serif">{luminaire.name}</p>
                            {luminaire.year && <p className="text-orange-600 text-xs font-serif">{luminaire.year}</p>}
                          </div>
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
