"use client"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  className?: string
}

export function RangeSlider({ min, max, step = 1, value, onValueChange, onValueCommit, className }: RangeSliderProps) {
  return (
    <div className={cn("relative flex items-center select-none touch-none w-full", className)}>
      <SliderPrimitive.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        max={max}
        min={min}
        step={step}
      >
        <SliderPrimitive.Track className="bg-secondary relative grow rounded-full h-2">
          <SliderPrimitive.Range className="absolute rounded-full h-full" style={{ backgroundColor: "#f2d895" }} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block w-5 h-5 bg-background border-2 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ borderColor: "#f2d895" }}
        />
        <SliderPrimitive.Thumb
          className="block w-5 h-5 bg-background border-2 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ borderColor: "#f2d895" }}
        />
      </SliderPrimitive.Root>
    </div>
  )
}
