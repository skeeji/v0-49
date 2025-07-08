"use client"

import { useState, useEffect } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

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
        <SliderPrimitive.Root
          className="relative flex w-full touch-none select-none items-center"
          value={localValue}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          max={max}
          min={min}
          step={1}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
            <SliderPrimitive.Range className="absolute h-full bg-[#f2d895]" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#f2d895] bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2d895] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#f2d895] bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2d895] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        </SliderPrimitive.Root>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
