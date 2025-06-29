import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    console.log("🖼️ API /api/images/filename/[filename] GET - Filename:", params.filename)

    // Simulation de récupération d'image par nom de fichier
    // Dans une vraie implémentation, vous chercheriez le fichier dans GridFS

    // Pour la démo, retourner une image placeholder
    const placeholderUrl = `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(params.filename)}`

    // Rediriger vers l'image placeholder
    return NextResponse.redirect(new URL(placeholderUrl, request.url))
  } catch (error) {
    console.error("❌ Erreur API /api/images/filename/[filename]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
