"use client"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface RangeSliderProps {
  min: number
  max: number
  value: number[]
  onValueCommit: (value: number[]) => void
  className?: string
}

export function RangeSlider({ min, max, value, onValueCommit, className }: RangeSliderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Année: {value[0]}</span>
        <span>{value[1]}</span>
      </div>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        value={value}
        onValueCommit={onValueCommit}
        max={max}
        min={min}
        step={1}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full rounded-full" style={{ backgroundColor: "#f97316" }} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md" />
      </SliderPrimitive.Root>
    </div>
  )
}
