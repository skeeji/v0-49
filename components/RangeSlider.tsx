"use client"

import { useState, useEffect, useRef } from "react"
import * as Slider from "@radix-ui/react-slider"

interface RangeSliderProps {
  min: number
  max: number
  value: number[]
  onChange: (value: number[]) => void
  label: string
}

export function RangeSlider({ min, max, value, onChange, label }: RangeSliderProps) {
  const [localValue, setLocalValue] = useState<number[]>(value)
  const isFirstRender = useRef(true)

  // Synchroniser la valeur locale avec la valeur externe
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Appliquer les changements après un délai pour éviter trop d'appels
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      onChange(localValue)
    }, 200)

    return () => clearTimeout(timer)
  }, [localValue, onChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{localValue[0]}</span>
          <span className="text-gray-400">—</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{localValue[1]}</span>
        </div>
      </div>

      <div className="relative pt-1">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          min={min}
          max={max}
          step={1}
          value={localValue}
          onValueChange={setLocalValue}
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-1.5">
            <Slider.Range className="absolute bg-orange rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-4 h-4 bg-white border-2 border-orange rounded-full focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 transition-transform hover:scale-110"
            aria-label="Année minimum"
          />
          <Slider.Thumb
            className="block w-4 h-4 bg-white border-2 border-orange rounded-full focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 transition-transform hover:scale-110"
            aria-label="Année maximum"
          />
        </Slider.Root>

        {/* Marqueurs d'années */}
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">{min}</span>
          <span className="text-xs text-gray-500">{Math.floor((min + max) / 2)}</span>
          <span className="text-xs text-gray-500">{max}</span>
        </div>
      </div>
    </div>
  )
}
