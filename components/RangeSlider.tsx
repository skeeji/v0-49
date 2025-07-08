"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"

interface RangeSliderProps {
  min: number
  max: number
  value: number[]
  onValueCommit: (value: number[]) => void
}

export function RangeSlider({ min, max, value, onValueCommit }: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  // Synchroniser avec les props
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = (newValue: number[]) => {
    setLocalValue(newValue)
  }

  const handleValueCommit = (newValue: number[]) => {
    console.log(`🎯 RangeSlider - Valeur commitée:`, newValue)
    onValueCommit(newValue)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Période chronologique</label>
        <span className="text-sm text-gray-500">
          {localValue[0]} - {localValue[1]}
        </span>
      </div>
      <div className="px-2">
        <Slider
          min={min}
          max={max}
          step={1}
          value={localValue}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-orange-500 [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-orange-500"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
