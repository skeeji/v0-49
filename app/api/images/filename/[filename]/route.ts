import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const luminaire = await db.collection("luminaires").findOne({
      $or: [
        { image_principale: filename },
        { images: filename },
        { image_principale: { $regex: filename, $options: "i" } },
      ],
    })

    if (luminaire) {
      return NextResponse.json({
        luminaireId: luminaire._id.toString(),
        found: true,
      })
    }

    // Si pas trouvé, chercher quand même l'image dans GridFS
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const file = await db.collection("uploads.files").findOne({ filename })

    if (!file) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    // L'image existe mais pas de luminaire associé
    return NextResponse.json({
      found: true,
      luminaireId: null,
    })
  } catch (error: any) {
    console.error(`Erreur lors de la recherche de l'image ${params.filename}:`, error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
