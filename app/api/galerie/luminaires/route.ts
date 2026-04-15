import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME     = process.env.MONGO_INITDB_DATABASE || "luminaires"
const COLLECTION = "luminaires_galerie"

export async function GET() {
  try {
    const client     = await clientPromise
    const db         = client.db(DBNAME)
    const luminaires = await db.collection(COLLECTION).find({ imageUrl: { $ne: "" } }).toArray()

    return NextResponse.json({
      success: true,
      luminaires: luminaires.map(l => ({
        _id:      l._id.toString(),
        nom:      l.nom      || "",
        designer: l.designer || "",
        annee:    l.annee    || "",
        imageUrl: l.imageUrl || "",
      })),
    })
  } catch (err: any) {
    console.error("❌ /api/galerie/luminaires:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
