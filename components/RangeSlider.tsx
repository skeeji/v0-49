"use client"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface RangeSliderProps {
  min: number
  max: number
  step: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  className?: string
}

export function RangeSlider({ min, max, step, value, onValueChange, onValueCommit, className }: RangeSliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      value={value}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      max={max}
      min={min}
      step={step}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
        <SliderPrimitive.Range className="absolute h-full rounded-full" style={{ backgroundColor: "#f2d895" }} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-5 w-5 rounded-full bg-white border-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{ borderColor: "#f2d895" }}
      />
      <SliderPrimitive.Thumb
        className="block h-5 w-5 rounded-full bg-white border-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{ borderColor: "#f2d895" }}
      />
    </SliderPrimitive.Root>
  )
}
