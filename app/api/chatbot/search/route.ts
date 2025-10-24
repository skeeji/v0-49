import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = "https://chatbot-984654216979.europe-west1.run.app"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, top_k = 5 } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/api/search_text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, top_k }),
    })

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Chatbot search error:", error)
    return NextResponse.json({ error: "Failed to search" }, { status: 500 })
  }
}
