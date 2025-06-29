"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Calendar, User, ImageIcon, ChevronDown, ChevronUp } from "lucide-react"

interface TimelineBlockProps {
  period: {
    name: string
    start: number
    end: number
    description: string
    luminaires: any[]
    image?: string
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
      {/* Point sur la timeline */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-4 w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full border-4 border-white shadow-xl z-20"></div>

      {/* Contenu */}
      <div className={`flex items-start ${isLeft ? "justify-start" : "justify-end"}`}>
        <div className={`w-full max-w-5xl ${isLeft ? "pr-16" : "pl-16"}`}>
          <Card className="overflow-hidden shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className={`flex ${isLeft ? "flex-row" : "flex-row-reverse"} h-full min-h-[500px]`}>
                {/* Contenu textuel */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  {/* En-tête */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-3xl font-serif text-gray-900 mb-3">{period.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">
                            {period.start} - {period.end}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {period.luminaires.length} luminaires
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-gray-500 hover:text-orange-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Description */}
                  <div className="mb-8 flex-grow">
                    {isEditing ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          className="min-h-[120px] text-base leading-relaxed"
                          placeholder="Description de la période..."
                        />
                        <div className="flex gap-3">
                          <Button size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-lg leading-relaxed">{period.description}</p>
                    )}
                  </div>

                  {/* Luminaires */}
                  {period.luminaires.length > 0 && (
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-orange-500" />
                        Luminaires de cette période
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {displayedLuminaires.map((luminaire, index) => (
                          <Link key={luminaire.id || index} href={`/luminaires/${luminaire.id}`}>
                            <div className="group cursor-pointer">
                              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-lg transition-all duration-300">
                                {luminaire.image ? (
                                  <Image
                                    src={luminaire.image || "/placeholder.svg"}
                                    alt={luminaire.name}
                                    width={200}
                                    height={200}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = "/placeholder.svg?height=200&width=200&text=Image+non+trouvée"
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-12 h-12" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <h5 className="font-medium text-gray-900 text-sm leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                                  {luminaire.name}
                                </h5>
                                {luminaire.artist && (
                                  <p className="text-gray-600 text-xs flex items-center gap-1 line-clamp-1">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    {luminaire.artist}
                                  </p>
                                )}
                                {luminaire.year && (
                                  <p className="text-orange-600 text-xs font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {luminaire.year}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {period.luminaires.length > 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllLuminaires(!showAllLuminaires)}
                          className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          {showAllLuminaires ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Voir moins
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Voir tous les {period.luminaires.length} luminaires
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Image de la période */}
                <div className="w-96 flex-shrink-0">
                  <div className="h-full min-h-[500px] relative bg-gradient-to-br from-orange-100 to-amber-100">
                    {period.image && (
                      <Image
                        src={period.image || "/placeholder.svg"}
                        alt={period.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="text-white font-serif text-2xl drop-shadow-lg mb-2">{period.name}</h4>
                      <p className="text-white/90 text-sm drop-shadow">
                        {period.start} - {period.end}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
