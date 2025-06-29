import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    // Chercher le logo principal
    const logoFile = await db.collection("logos.files").findOne({ "metadata.type": "main" })

    if (!logoFile) {
      return NextResponse.json({ success: false, error: "Aucun logo trouvé" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      logo: {
        _id: logoFile._id,
        filename: logoFile.filename,
        contentType: logoFile.metadata?.contentType || "image/png",
      },
    })
  } catch (error) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
