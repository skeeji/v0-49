"use client"

import type React from "react"
import { useState } from "react"

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => void
  multiline: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  multiline,
  placeholder = "",
  disabled = false,
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [currentValue, setValue] = useState(value)

  const handleSave = () => {
    const finalValue = multiline ? currentValue : currentValue.replace(/\n/g, " ").trim()
    onSave(finalValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div>
      {isEditing ? (
        multiline ? (
          <textarea
            value={currentValue}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full p-2 border border-gray-300 rounded resize-none ${className}`}
            placeholder={placeholder}
            disabled={disabled}
            rows={Math.max(3, currentValue.split("\n").length)}
            style={{ whiteSpace: "pre-wrap" }}
          />
        ) : (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full p-2 border border-gray-300 rounded ${className}`}
            placeholder={placeholder}
            disabled={disabled}
          />
        )
      ) : (
        <div
          onClick={() => !disabled && setIsEditing(true)}
          className={`cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[2rem] ${className} ${
            disabled ? "cursor-default" : ""
          }`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {value || placeholder}
        </div>
      )}
    </div>
  )
}

export default EditableField
