"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const toggleDirection = () => {
    onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")
  }

  return (
    <div className="flex gap-2">
      <Select value={sortField} onValueChange={(value) => onSortChange(value, sortDirection)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Trier par..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={toggleDirection} variant="outline" size="sm" className="px-3 bg-transparent">
        {sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
      </Button>
    </div>
  )
}
