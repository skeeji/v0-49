"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Edit2, Check, X } from "lucide-react"

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
}

export function EditableField({ value, onSave, multiline = false, placeholder, className }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave()
    }
    if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[100px]"
            autoFocus
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="w-3 h-3 mr-1" />
            Sauvegarder
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-3 h-3 mr-1" />
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      <div
        className={`${multiline ? "min-h-[60px]" : ""} p-3 bg-gray-50 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors`}
      >
        {value || <span className="text-gray-400 italic">{placeholder || "Cliquez pour modifier..."}</span>}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  )
}
