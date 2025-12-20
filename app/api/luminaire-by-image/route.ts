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

    const luminaire = await db.collection("luminaires").findOne({
      $or: [
        { filename: filename },
        { filename: { $regex: new RegExp(`^${filename}$`, "i") } },
        { "Nom du fichier": filename },
        { "Nom du fichier": { $regex: new RegExp(`^${filename}$`, "i") } },
        { "Image luminaire (Nom du fichier)": filename },
        { "Image luminaire (Nom du fichier)": { $regex: new RegExp(`^${filename}$`, "i") } },
        { image_principale: filename },
        { images: filename },
        { image_principale: { $regex: new RegExp(`^${filename}$`, "i") } },
      ],
    })

    if (luminaire) {
      const nom =
        luminaire.nom ||
        luminaire.Nom ||
        luminaire.title ||
        luminaire.name ||
        luminaire["Nom du luminaire"] ||
        "Sans nom"
      const artiste =
        luminaire.artiste ||
        luminaire.designer ||
        luminaire.artist ||
        luminaire["Artiste / Dates"] ||
        luminaire.Artiste ||
        "Inconnu"
      const annee = luminaire.annee || luminaire.year || luminaire.date || luminaire["Année"] || luminaire.Annee || ""

      return NextResponse.json({
        success: true,
        luminaireId: luminaire._id.toString(),
        found: true,
        metadata: {
          nom,
          artiste,
          annee,
        },
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
