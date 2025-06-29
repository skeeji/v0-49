"use client"

import { Slider } from "@/components/ui/slider"

interface RangeSliderProps {
  label: string
  value: [number, number]
  onChange: (value: [number, number]) => void
  min: number
  max: number
  step?: number
}

export function RangeSlider({ label, value, onChange, min, max, step = 1 }: RangeSliderProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="px-2">
        <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} className="w-full" />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{value[0]}</span>
        <span>{value[1]}</span>
      </div>
    </div>
  )
}
