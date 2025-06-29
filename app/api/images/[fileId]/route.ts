import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    console.log("🖼️ API /api/images/[fileId] GET - FileId:", params.fileId)

    // Simulation de récupération d'image
    // Dans une vraie implémentation, vous récupéreriez l'image depuis GridFS

    // Pour la démo, retourner une image placeholder
    const placeholderUrl = `/placeholder.svg?height=400&width=400&text=${encodeURIComponent("Image " + params.fileId)}`

    // Rediriger vers l'image placeholder
    return NextResponse.redirect(new URL(placeholderUrl, request.url))
  } catch (error) {
    console.error("❌ Erreur API /api/images/[fileId]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
