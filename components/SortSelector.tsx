"use client"

import React from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SortOption {
  value: string
  label: string
}

interface SortSelectorProps {
  sortField: string
  sortDirection: "asc" | "desc"
  onSortChange: (field: string, direction: "asc" | "desc") => void
  options: SortOption[]
}

export function SortSelector({ sortField, sortDirection, onSortChange, options }: SortSelectorProps) {
  const handleSortChange = (value: string) => {
    const [field, direction] = value.split("-")
    onSortChange(field, direction as "asc" | "desc")
  }

  const currentValue = `${sortField}-${sortDirection}`

  return (
    <Select value={currentValue} onValueChange={handleSortChange}>
      <SelectTrigger>
        <SelectValue placeholder="Trier par..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <React.Fragment key={option.value}>
            <SelectItem value={`${option.value}-asc`}>{option.label} (A → Z)</SelectItem>
            <SelectItem value={`${option.value}-desc`}>{option.label} (Z → A)</SelectItem>
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  )
}
