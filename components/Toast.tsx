"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface ToastProps {
  message: string
  type: "success" | "error" | "info"
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Attendre la fin de l'animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type]

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white shadow-lg transition-all duration-300 ${bgColor} ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button onClick={() => setIsVisible(false)} className="hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
