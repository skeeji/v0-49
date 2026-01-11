"use client"

import { useState, useEffect } from "react"

interface APIResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAPI<T>(url: string, options?: RequestInit): APIResponse<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [url])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

export function useLuminaires(filters?: Record<string, any>) {
  const queryParams = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          queryParams.set(key, value.join(","))
        } else {
          queryParams.set(key, value.toString())
        }
      }
    })
  }

  const url = `/api/luminaires${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  return useAPI<{
    luminaires: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>(url)
}

export function useLuminaire(id: string) {
  return useAPI<any>(`/api/luminaires/${id}`)
}

export function useDesigners(search?: string) {
  const url = `/api/designers${search ? `?search=${encodeURIComponent(search)}` : ""}`
  return useAPI<any[]>(url)
}

export function useDesigner(name: string) {
  return useAPI<{
    designer: any
    luminaires: any[]
  }>(`/api/designers/${encodeURIComponent(name)}`)
}

export function useTimelineDescriptions() {
  return useAPI<any[]>("/api/timeline/descriptions")
}
