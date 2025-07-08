"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  className?: string
}

export function RangeSlider({ min, max, step = 1, value, onValueChange, className }: RangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = (newValue: number[]) => {
    const rangeValue: [number, number] = [newValue[0], newValue[1]]
    setLocalValue(rangeValue)
    onValueChange(rangeValue)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>{localValue[0]}</span>
        <span>{localValue[1]}</span>
      </div>
      <div className="px-2">
        <style jsx>{`
          .range-slider [data-radix-slider-root] {
            position: relative;
            display: flex;
            align-items: center;
            user-select: none;
            touch-action: none;
            width: 100%;
            height: 20px;
          }
          
          .range-slider [data-radix-slider-track] {
            background-color: #e5e7eb !important;
            position: relative;
            flex-grow: 1;
            border-radius: 9999px;
            height: 3px;
          }
          
          .range-slider [data-radix-slider-range] {
            position: absolute;
            background-color: #ff8c00 !important;
            border-radius: 9999px;
            height: 100%;
          }
          
          .range-slider [data-radix-slider-thumb] {
            display: block;
            width: 20px;
            height: 20px;
            background-color: white !important;
            border: 2px solid #ff8c00 !important;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            cursor: pointer;
          }
          
          .range-slider [data-radix-slider-thumb]:hover {
            background-color: white !important;
            border-color: #ff8c00 !important;
          }
          
          .range-slider [data-radix-slider-thumb]:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
          }
        `}</style>
        <div className="range-slider">
          <Slider
            min={min}
            max={max}
            step={step}
            value={localValue}
            onValueChange={handleValueChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}
