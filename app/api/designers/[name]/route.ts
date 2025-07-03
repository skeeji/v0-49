import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    if (!designerName) {
      return NextResponse.json({ success: false, error: "Nom du designer manquant." }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = await collection
      .find({
        $or: [{ designer: designerName }, { "Artiste / Dates": designerName }],
      })
      .toArray()

    if (luminaires.length === 0) {
      return NextResponse.json({ success: false, error: "Designer non trouvé." }, { status: 404 })
    }

    // Trouver la première image de designer disponible pour ce groupe
    const designerImageFilename = luminaires.find((lum) => lum.designerImageFilename)?.designerImageFilename

    const designerData = {
      nom: designerName,
      count: luminaires.length,
      // CORRECTION: Fournir l'URL complète de l'image
      designerImage: designerImageFilename ? `/api/images/filename/${designerImageFilename}` : null,
    }

    return NextResponse.json({ success: true, data: { designer: designerData, luminaires } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Erreur serveur.", details: error.message }, { status: 500 })
  }
}
