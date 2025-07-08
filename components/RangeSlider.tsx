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

  // Synchroniser avec les props et s'assurer que les valeurs sont valides
  useEffect(() => {
    if (Array.isArray(value) && value.length === 2 && !isNaN(value[0]) && !isNaN(value[1])) {
      setLocalValue(value)
    } else {
      // Pas de valeurs par défaut - utiliser les valeurs min/max passées en props
      setLocalValue([min, max])
    }
  }, [value, min, max])

  const handleValueChange = (newValue: number[]) => {
    if (Array.isArray(newValue) && newValue.length === 2 && !isNaN(newValue[0]) && !isNaN(newValue[1])) {
      setLocalValue(newValue)
    }
  }

  const handleValueCommit = (newValue: number[]) => {
    if (Array.isArray(newValue) && newValue.length === 2 && !isNaN(newValue[0]) && !isNaN(newValue[1])) {
      console.log(`🎯 RangeSlider - Valeur commitée:`, newValue)
      onValueCommit(newValue)
    }
  }

  // S'assurer que min et max sont des nombres valides
  const safeMin = isNaN(min) ? 1900 : min
  const safeMax = isNaN(max) ? 2024 : max
  const safeValue =
    Array.isArray(localValue) && localValue.length === 2 && !isNaN(localValue[0]) && !isNaN(localValue[1])
      ? localValue
      : [safeMin, safeMax]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Période chronologique</label>
        <span className="text-sm text-gray-500">
          {safeValue[0]} - {safeValue[1]}
        </span>
      </div>
      <div className="px-2">
        <Slider
          min={safeMin}
          max={safeMax}
          step={1}
          value={safeValue}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#f2d895] [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-[#f2d895]"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{safeMin}</span>
        <span>{safeMax}</span>
      </div>
    </div>
  )
}
