import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get("filename")

    if (!filename) {
      return NextResponse.json({ success: false, error: "Filename required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    const collection = db.collection("luminaires")

    // Tentative 1 : comparaisons exactes (utilise les index)
    let luminaire = await collection.findOne({
      $or: [
        { filename: filename },
        { "Nom du fichier": filename },
        { "Image luminaire (Nom du fichier)": filename },
        { image_principale: filename },
        { images: filename },
      ],
    })

    // Tentative 2 : fallback regex case-insensitive si aucun résultat exact
    if (!luminaire) {
      const regex = new RegExp(`^${filename}$`, "i")
      luminaire = await collection.findOne({
        $or: [
          { filename: regex },
          { "Nom du fichier": regex },
          { "Image luminaire (Nom du fichier)": regex },
          { image_principale: regex },
          { images: regex },
        ],
      })
    }

    if (luminaire) {
      return NextResponse.json({
        success: true,
        luminaireId: luminaire._id.toString(),
        found: true,
      })
    }

    return NextResponse.json({
      success: false,
      found: false,
      luminaireId: null,
    })
  } catch (error: any) {
    console.error("Erreur lors de la recherche du luminaire:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
