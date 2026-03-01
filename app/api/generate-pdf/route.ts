import { NextRequest, NextResponse } from "next/server"

const PDF_API_URL = "https://chatbot-984654216979.europe-west1.run.app/api/generate_pdf"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] PDF generation request:", JSON.stringify(body, null, 2))

    // Forward the request to the external PDF API
    const response = await fetch(PDF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] PDF API error:", response.status, errorText)
      return NextResponse.json(
        { error: `PDF generation failed: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the PDF as a buffer
    const pdfBuffer = await response.arrayBuffer()

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="selection_gersaint_${body.client_name || "client"}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] PDF generation error:", error)
    return NextResponse.json(
      { error: "Internal server error during PDF generation" },
      { status: 500 }
    )
  }
}
