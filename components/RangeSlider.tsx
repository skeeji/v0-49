"use client"

import * as Slider from "@radix-ui/react-slider"

interface RangeSliderProps {
  min: number
  max: number
  value: number[]
  onValueCommit: (value: number[]) => void
  label?: string
}

export function RangeSlider({ min, max, value, onValueCommit, label = "Chronologie" }: RangeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-50 rounded text-gray-600 font-mono">{value[0]}</span>
          <span className="text-gray-400">—</span>
          <span className="px-2 py-1 bg-gray-50 rounded text-gray-600 font-mono">{value[1]}</span>
        </div>
      </div>
      <div className="relative pt-2">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-6"
          min={min}
          max={max}
          step={1}
          value={value}
          onValueCommit={onValueCommit}
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
            <Slider.Range className="absolute rounded-full h-full" style={{ backgroundColor: "#f2d895" }} />
          </Slider.Track>
          <Slider.Thumb
            className="block w-5 h-5 bg-white shadow-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:scale-110 cursor-grab active:cursor-grabbing"
            style={{ borderColor: "#f2d895", borderWidth: "2px" }}
            aria-label="Année minimum"
          />
          <Slider.Thumb
            className="block w-5 h-5 bg-white shadow-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:scale-110 cursor-grab active:cursor-grabbing"
            style={{ borderColor: "#f2d895", borderWidth: "2px" }}
            aria-label="Année maximum"
          />
        </Slider.Root>
      </div>
    </div>
  )
}
