"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, X, Edit } from "lucide-react"

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  disabled?: boolean
  className?: string
}

export function EditableField({
  value,
  onSave,
  placeholder = "",
  multiline = false,
  disabled = false,
  className = "",
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

  if (disabled) {
    return (
      <div className={`p-2 ${className}`}>{value || <span className="text-gray-400 italic">{placeholder}</span>}</div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px]"
          />
        ) : (
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder={placeholder} />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group cursor-pointer p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center justify-between">
        <span>{value || <span className="text-gray-400 italic">{placeholder}</span>}</span>
        <Edit className="w-4 h-4 opacity-0 group-hover:opacity-50" />
      </div>
    </div>
  )
}
