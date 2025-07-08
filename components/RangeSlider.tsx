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
  const [localValue, setLocalValue] = useState<number[]>([])

  // Synchroniser avec les props seulement quand elles sont valides
  useEffect(() => {
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      !isNaN(value[0]) &&
      !isNaN(value[1]) &&
      !isNaN(min) &&
      !isNaN(max) &&
      min < max
    ) {
      setLocalValue(value)
    } else if (!isNaN(min) && !isNaN(max) && min < max) {
      // Pas de valeur par défaut - utiliser les bornes min/max des données
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

  // Ne pas afficher le slider si les données ne sont pas encore chargées
  if (isNaN(min) || isNaN(max) || min >= max || localValue.length !== 2) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Période chronologique</label>
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      </div>
    )
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
          className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#f2d895] [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-[#f2d895]"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
