import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = await collection
      .find(
        { $or: [{ filename: { $exists: true, $nin: [null, ""] } }, { "Image luminaire (Nom du fichier)": { $exists: true, $nin: [null, ""] } }] },
        {
          projection: {
            _id: 1,
            filename: 1,
            "Nom du fichier": 1,
            "Image luminaire (Nom du fichier)": 1,
            nom: 1,
            "Nom luminaire": 1,
            designer: 1,
            "Artiste / Dates": 1,
            annee: 1,
            "Année": 1,
          },
        }
      )
      .toArray()

    const items = luminaires
      .map((l) => {
        const filename = l.filename || l["Image luminaire (Nom du fichier)"] || l["Nom du fichier"]
        if (!filename) return null
        return {
          _id: String(l._id),
          nom: l.nom || l["Nom luminaire"] || "Luminaire",
          designer: l.designer || l["Artiste / Dates"] || "",
          annee: l.annee || l["Année"] || "",
          imageUrl: `/api/images/filename/${filename}`,
        }
      })
      .filter(Boolean)

    return NextResponse.json(
      { success: true, luminaires: items },
      { headers: { "Cache-Control": "public, s-maxage=300" } }
    )
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires-gallery:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors du chargement", details: error.message },
      { status: 500 }
    )
  }
}
