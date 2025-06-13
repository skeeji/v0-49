"use client"

export function useToast() {
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const event = new CustomEvent("show-toast", {
      detail: { message, type },
    })
    window.dispatchEvent(event)
  }

  return { showToast }
}
