"use client"

import type React from "react"

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
          className="w-full"
          style={
            {
              "--slider-track": "#e5e7eb",
              "--slider-range": "#f2d895",
              "--slider-thumb": "#ffffff",
              "--slider-thumb-border": "#f2d895",
            } as React.CSSProperties
          }
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <style jsx>{`
        .slider-root {
          position: relative;
          display: flex;
          align-items: center;
          user-select: none;
          touch-action: none;
          width: 100%;
          height: 20px;
        }
        
        .slider-track {
          background-color: #e5e7eb;
          position: relative;
          flex-grow: 1;
          border-radius: 9999px;
          height: 8px;
        }
        
        .slider-range {
          position: absolute;
          background-color: #f2d895;
          border-radius: 9999px;
          height: 100%;
        }
        
        .slider-thumb {
          display: block;
          width: 20px;
          height: 20px;
          background-color: white;
          border: 2px solid #f2d895;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }
        
        .slider-thumb:hover {
          background-color: #f9f9f9;
        }
        
        .slider-thumb:focus {
          outline: none;
          box-shadow: 0 0 0 2px #f2d895;
        }
      `}</style>
    </div>
  )
}
