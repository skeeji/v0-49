"use client"

import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface RangeSliderProps {
  value: number[]
  onChange: (value: number[]) => void
  min: number
  max: number
  step: number
  label: string
  className?: string
}

export function RangeSlider({ value, onChange, min, max, step, label, className }: RangeSliderProps) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">
        {label}: {value[0]} - {value[1]}
      </Label>
      <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} className="w-full" />
    </div>
  )
}
