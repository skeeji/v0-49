"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  disabled?: boolean
}

export function EditableField({
  value: initialValue,
  onSave,
  placeholder = "Entrez du texte",
  multiline = false,
  className = "",
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const { userData } = useAuth()
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleEditClick = () => {
    if (!canEdit || disabled) return
    setIsEditing(true)
  }

  const handleSaveClick = () => {
    if (!canEdit || disabled) return

    onSave(value)
    setIsEditing(false)
  }

  const handleCancelClick = () => {
    setValue(initialValue)
    setIsEditing(false)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (!canEdit || disabled) {
    return (
      <div className={className}>
        {multiline ? (
          <div className="whitespace-pre-line">{initialValue || placeholder}</div>
        ) : (
          initialValue || placeholder
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      {isEditing ? (
        <>
          {multiline ? (
            <Textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1 mr-2"
            />
          ) : (
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1 mr-2"
            />
          )}
          <Button variant="ghost" size="sm" onClick={handleSaveClick}>
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancelClick}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          {multiline ? (
            <div className="flex-1 whitespace-pre-line">{initialValue || placeholder}</div>
          ) : (
            <div className="flex-1">{initialValue || placeholder}</div>
          )}
          <Button variant="ghost" size="sm" onClick={handleEditClick}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  )
}
