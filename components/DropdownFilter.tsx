"use client"

import type React from "react"

interface DropdownFilterProps {
  label: string
  options: string[]
  onChange: (value: string) => void
}

const DropdownFilter: React.FC<DropdownFilterProps> = ({ label, options, onChange }) => {
  return (
    <select onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

export default DropdownFilter
