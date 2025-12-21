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
      <div className="relative z-5">
        {/* Layout Desktop */}
        <div className="hidden lg:flex items-stretch gap-12 min-h-[500px]">
          {period.imageUrl && isLeft && (
            <div className="w-96 flex-shrink-0">
              <div className="h-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/10">
                <img
                  src={period.imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period.name}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}

          <Card
            className={`flex-1 max-w-3xl backdrop-blur-md bg-card/80 border-border/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 ${
              isLeft ? "" : ""
            }`}
          >
            <CardContent className="p-10 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-4xl font-light text-foreground mb-3 tracking-tight">{period.name}</h3>
                  <div className="flex items-center gap-4 text-base text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-light">
                        {period.start} - {period.end}
                      </span>
                    </div>
                    <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-light">
                      {period.luminaires.length} luminaires
                    </Badge>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <div className="mb-8">
                {isEditing && canEdit ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[120px] text-base leading-relaxed rounded-2xl"
                      placeholder="Description de la période..."
                    />
                    <div className="flex gap-3">
                      <Button size="default" onClick={handleSave} className="rounded-full">
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button
                        size="default"
                        variant="outline"
                        onClick={handleCancel}
                        className="rounded-full bg-transparent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg leading-relaxed font-light">{period.description}</p>
                )}
              </div>

              {period.luminaires.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-2xl font-light text-foreground mb-6 flex items-center gap-3">
                    <ImageIcon className="w-6 h-6" />
                    Luminaires de cette période
                  </h4>

                  <div className="relative">
                    {period.luminaires.length > 3 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute -left-5 top-1/2 transform -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border/50"
                        onClick={() => scrollCarousel("left")}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    )}

                    <div
                      ref={carouselRef}
                      className="flex gap-6 overflow-x-auto scrollbar-hide px-2 pb-4"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {period.luminaires.map((luminaire, index) => (
                        <Link
                          key={luminaire.id || index}
                          href={`/luminaires/${luminaire.id}`}
                          className="flex-shrink-0 group cursor-pointer"
                        >
                          <div className="w-48 bg-card/60 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-4 border border-border/30">
                            <div className="w-full h-40 bg-muted/30 rounded-xl overflow-hidden mb-4">
                              {luminaire.image ? (
                                <img
                                  src={luminaire.image || "/placeholder.svg"}
                                  alt={luminaire.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg?height=160&width=192&text=Image+non+trouvée"
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <ImageIcon className="w-10 h-10" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <p className="font-light text-foreground line-clamp-2 text-base leading-snug">
                                {luminaire.name}
                              </p>
                              {luminaire.artist && (
                                <p className="text-muted-foreground text-sm line-clamp-1 flex items-center gap-2 font-light">
                                  <User className="w-4 h-4" />
                                  {luminaire.artist}
                                </p>
                              )}
                              {luminaire.year && (
                                <p className="text-primary text-sm flex items-center gap-2 font-medium">
                                  <Calendar className="w-4 h-4" />
                                  {luminaire.year}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {period.luminaires.length > 3 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute -right-5 top-1/2 transform -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border/50"
                        onClick={() => scrollCarousel("right")}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {period.imageUrl && !isLeft && (
            <div className="w-96 flex-shrink-0">
              <div className="h-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/10">
                <img
                  src={period.imageUrl || "/placeholder.svg"}
                  alt={`Illustration ${period.name}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:hidden">
          {period.imageUrl && (
            <div className="mb-8">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-xl ring-1 ring-border/10">
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

          <Card className="backdrop-blur-md bg-card/80 border-border/50 rounded-3xl shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-light text-foreground mb-3 tracking-tight">{period.name}</h3>
                  <div className="flex flex-col gap-3 text-base text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-light">
                        {period.start} - {period.end}
                      </span>
                    </div>
                    <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-light w-fit">
                      {period.luminaires.length} luminaires
                    </Badge>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <div className="mb-8">
                {isEditing && canEdit ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px] text-base leading-relaxed rounded-2xl"
                      placeholder="Description de la période..."
                    />
                    <div className="flex gap-3">
                      <Button size="default" onClick={handleSave} className="rounded-full">
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button
                        size="default"
                        variant="outline"
                        onClick={handleCancel}
                        className="rounded-full bg-transparent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg leading-relaxed font-light">{period.description}</p>
                )}
              </div>

              {period.luminaires.length > 0 && (
                <div>
                  <h4 className="text-xl font-light text-foreground mb-6 flex items-center gap-3">
                    <ImageIcon className="w-5 h-5" />
                    Luminaires de cette période
                  </h4>

                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {period.luminaires.map((luminaire, index) => (
                      <Link
                        key={luminaire.id || index}
                        href={`/luminaires/${luminaire.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                      >
                        <div className="w-36 bg-card/60 backdrop-blur-sm rounded-2xl shadow-md p-3 border border-border/30">
                          <div className="w-full h-28 bg-muted/30 rounded-xl overflow-hidden mb-3">
                            {luminaire.image ? (
                              <img
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=112&width=144&text=Image+non+trouvée"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-light text-foreground line-clamp-2 text-sm leading-snug">
                              {luminaire.name}
                            </p>
                            {luminaire.year && <p className="text-primary text-xs font-medium">{luminaire.year}</p>}
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
