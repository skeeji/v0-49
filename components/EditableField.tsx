"use client"

import { useState } from "react"
import { Edit2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void
  className?: string
  placeholder?: string
  multiline?: boolean
}

export function EditableField({
  value,
  onSave,
  className = "",
  placeholder = "",
  multiline = false,
}: EditableFieldProps) {
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

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            rows={3}
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
        )}

        <Button onClick={handleSave} size="sm" className="bg-green-500 hover:bg-green-600">
          <Check className="w-4 h-4" />
        </Button>

        <Button onClick={handleCancel} variant="outline" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`group cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center gap-2">
        <span className={value ? "" : "text-gray-400 italic"}>{value || placeholder}</span>
        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
