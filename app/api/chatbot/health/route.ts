import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = "https://chatbot-984654216979.europe-west1.run.app"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    })

    if (!response.ok) {
      return NextResponse.json({ status: "offline" }, { status: 503 })
    }

    const data = await response.json()
    return NextResponse.json({ status: "ready", ...data })
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json({ status: "offline" }, { status: 503 })
  }
}
