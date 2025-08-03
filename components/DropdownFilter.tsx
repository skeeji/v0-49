"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DropdownFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}

export function DropdownFilter({ label, value, onChange, options }: DropdownFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={`Tous les ${label.toLowerCase()}s`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les {label.toLowerCase()}s</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
