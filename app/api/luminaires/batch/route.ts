import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { normalizeLuminaire } from "@/lib/luminaire-fields"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"

const FILE_FIELDS = [
  "filename",
  "Nom du fichier",
  "Image luminaire (Nom du fichier)",
  "image_principale",
]

// POST { filenames: string[] }
// Returns { success: true, result: Record<filename, LuminairePayload> }
export async function POST(request: NextRequest) {
  try {
    const { filenames } = await request.json()

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json({ success: false, error: "filenames array required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Single round-trip: exact match on all filename fields for all requested names
    const conditions = filenames.flatMap((f: string) =>
      FILE_FIELDS.map((field) => ({ [field]: f })).concat([{ images: f }])
    )

    const docs = await collection.find({ $or: conditions }).toArray()

    const result: Record<string, ReturnType<typeof buildPayload>> = {}

    function buildPayload(doc: any) {
      const n = normalizeLuminaire(doc)
      return {
        luminaireId: n.id,
        nom: n.nom,
        artiste: n.artiste,
        annee: n.annee,
        dimensions: n.dimensions,
        materiaux: n.materiaux,
        puissance: n.puissance,
        prixHT: n.estimation,
      }
    }

    function indexDoc(doc: any) {
      const payload = buildPayload(doc)
      const fields = [
        doc.filename,
        doc["Nom du fichier"],
        doc["Image luminaire (Nom du fichier)"],
        doc.image_principale,
        ...(Array.isArray(doc.images) ? doc.images : [doc.images]),
      ].filter(Boolean) as string[]

      for (const f of fields) {
        const key = f.toLowerCase().trim()
        if (!result[key]) result[key] = payload
      }
    }

    docs.forEach(indexDoc)

    // Regex fallback only for filenames still unresolved
    const unresolved = filenames.filter((f: string) => !result[f.toLowerCase()])
    if (unresolved.length > 0) {
      const regexConditions = unresolved.flatMap((f: string) => {
        const re = new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
        return FILE_FIELDS.map((field) => ({ [field]: re }))
      })

      const fallbackDocs = await collection.find({ $or: regexConditions }).toArray()
      fallbackDocs.forEach(indexDoc)
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error("[batch] Erreur:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
