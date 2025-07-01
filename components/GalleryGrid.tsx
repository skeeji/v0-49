"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"

interface GalleryGridProps {
  items: any[]
  viewMode: "grid" | "list"
  onItemUpdate: (id: string, updates: any) => void
  columns?: number
}

export function GalleryGrid({ items, viewMode, onItemUpdate, columns = 4 }: GalleryGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  const handleEdit = (id: string) => {
    setEditingId(editingId === id ? null : id)
  }

  const handleUpdate = (id: string, field: string, value: any) => {
    onItemUpdate(id, { [field]: value })
  }

  const handleDelete = () => {
    // Recharger la page après suppression
    window.location.reload()
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.nom || item.name || "Luminaire"}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-sm">Pas d'image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <EditableField
                        value={item.nom || item.name || ""}
                        onSave={(value) => handleUpdate(item._id, "nom", value)}
                        isEditing={editingId === item._id}
                        className="text-xl font-semibold text-gray-900 mb-2"
                        placeholder="Nom du luminaire"
                      />
                      <EditableField
                        value={item.designer || item.artist || ""}
                        onSave={(value) => handleUpdate(item._id, "designer", value)}
                        isEditing={editingId === item._id}
                        className="text-gray-600 mb-2"
                        placeholder="Designer"
                      />
                      {(item.annee || item.year) && (
                        <Badge variant="secondary" className="mb-2">
                          {item.annee || item.year}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <FavoriteToggleButton
                        itemId={item._id}
                        isFavorite={item.isFavorite}
                        onToggle={(isFavorite) => handleUpdate(item._id, "isFavorite", isFavorite)}
                      />
                      <Link href={`/luminaires/${item._id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item._id)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <DeleteLuminaireButton
                            luminaireId={item._id}
                            luminaireName={item.nom || item.name || "Luminaire"}
                            onDelete={handleDelete}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <EditableField
                    value={item.description || item.collaboration || ""}
                    onSave={(value) => handleUpdate(item._id, "description", value)}
                    isEditing={editingId === item._id}
                    className="text-gray-600 text-sm"
                    placeholder="Description"
                    multiline
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Vue grille
  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    8: "grid-cols-8",
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-6`}>
      {items.map((item) => (
        <Card key={item._id} className="group overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {/* Image */}
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.nom || item.name || "Luminaire"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-sm">Pas d'image</span>
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <FavoriteToggleButton
                    itemId={item._id}
                    isFavorite={item.isFavorite}
                    onToggle={(isFavorite) => handleUpdate(item._id, "isFavorite", isFavorite)}
                    variant="overlay"
                  />
                  <Link href={`/luminaires/${item._id}`}>
                    <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  {isAdmin && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => handleEdit(item._id)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <DeleteLuminaireButton
                        luminaireId={item._id}
                        luminaireName={item.nom || item.name || "Luminaire"}
                        onDelete={handleDelete}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-4">
              <EditableField
                value={item.nom || item.name || ""}
                onSave={(value) => handleUpdate(item._id, "nom", value)}
                isEditing={editingId === item._id}
                className="font-semibold text-gray-900 mb-1 line-clamp-2"
                placeholder="Nom du luminaire"
              />
              <EditableField
                value={item.designer || item.artist || ""}
                onSave={(value) => handleUpdate(item._id, "designer", value)}
                isEditing={editingId === item._id}
                className="text-sm text-gray-600 mb-2 line-clamp-1"
                placeholder="Designer"
              />
              {(item.annee || item.year) && (
                <Badge variant="secondary" className="text-xs">
                  {item.annee || item.year}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
