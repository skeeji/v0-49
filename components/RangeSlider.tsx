"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"

interface RangeSliderProps {
  min: number
  max: number
  onChange: (values: [number, number]) => void
  initialValues?: [number, number]
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, onChange, initialValues }) => {
  const [minValue, setMinValue] = useState(min)
  const [maxValue, setMaxValue] = useState(max)

  useEffect(() => {
    if (initialValues) {
      setMinValue(initialValues[0])
      setMaxValue(initialValues[1])
    } else {
      setMinValue(min)
      setMaxValue(max)
    }
  }, [min, max, initialValues])

  const handleMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.min(Number(event.target.value), maxValue)
      setMinValue(value)
      onChange([value, maxValue])
    },
    [maxValue, onChange],
  )

  const handleMaxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(Number(event.target.value), minValue)
      setMaxValue(value)
      onChange([minValue, value])
    },
    [minValue, onChange],
  )

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100
  }

  const minPercentage = getPercentage(minValue)
  const maxPercentage = getPercentage(maxValue)

  return (
    <div className="relative w-full h-2">
      <div className="absolute top-0 left-0 w-full h-full bg-gray-200 rounded-full"></div>
      <div
        className="absolute top-0 h-full bg-[#f2d895] rounded-full"
        style={{ left: `${minPercentage}%`, width: `${maxPercentage - minPercentage}%` }}
      ></div>
      <input
        type="range"
        min={min}
        max={max}
        value={minValue}
        onChange={handleMinChange}
        className="absolute top-0 w-full h-full appearance-none pointer-events-none bg-transparent"
        style={{
          left: 0,
          zIndex: 2,
          "--range-thumb-color": "#fff",
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={maxValue}
        onChange={handleMaxChange}
        className="absolute top-0 w-full h-full appearance-none pointer-events-none bg-transparent"
        style={{
          left: 0,
          zIndex: 3,
          "--range-thumb-color": "#fff",
        }}
      />
      <style jsx global>{`
        input[type='range'] {
          --range-track-height: 6px;
          --range-thumb-height: 16px;
          --range-thumb-width: 16px;
          --range-thumb-color: #fff;
        }

        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: var(--range-thumb-height);
          width: var(--range-thumb-width);
          border-radius: 50%;
          background-color: var(--range-thumb-color);
          border: 2px solid #fff;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        }

        input[type='range']::-moz-range-thumb {
          height: var(--range-thumb-height);
          width: var(--range-thumb-width);
          border-radius: 50%;
          background-color: var(--range-thumb-color);
          border: 2px solid #fff;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          border: none;
        }

        input[type='range']::-ms-thumb {
          height: var(--range-thumb-height);
          width: var(--range-thumb-width);
          border-radius: 50%;
          background-color: var(--range-thumb-color);
          border: 2px solid #fff;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          border: none;
        }

        input[type='range']::-webkit-slider-runnable-track {
          height: var(--range-track-height);
          background: transparent;
          border: none;
        }

        input[type='range']::-moz-range-track {
          height: var(--range-track-height);
          background: transparent;
          border: none;
        }

        input[type='range']::-ms-track {
          height: var(--range-track-height);
          background: transparent;
          border: none;
        }

        input[type='range']:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
}

export default RangeSlider
