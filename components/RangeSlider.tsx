"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"

interface RangeSliderProps {
  min: number
  max: number
  value: number[]
  onChange: (value: number[]) => void
  label: string
}

export function RangeSlider({ min, max, value, onChange, label }: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = (newValue: number[]) => {
    setLocalValue(newValue)
    onChange(newValue)
  }

  // S'assurer que les valeurs sont dans les bonnes limites
  const safeMin = Math.max(min, 1900)
  const safeMax = Math.min(max, 2024)
  const safeValue = [Math.max(localValue[0], safeMin), Math.min(localValue[1], safeMax)]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="text-sm text-gray-500">
          {safeValue[0]} - {safeValue[1]}
        </div>
      </div>
      <div className="px-3">
        <Slider
          min={safeMin}
          max={safeMax}
          step={1}
          value={safeValue}
          onValueChange={handleValueChange}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{safeMin}</span>
        <span>{safeMax}</span>
      </div>
    </div>
  )
}
