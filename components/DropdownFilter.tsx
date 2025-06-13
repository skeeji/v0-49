"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterOption {
  value: string
  label: string
}

interface DropdownFilterProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
}

export function DropdownFilter({ value, onChange, options, placeholder = "Sélectionner..." }: DropdownFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
