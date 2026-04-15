import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME      = process.env.MONGO_INITDB_DATABASE || "luminaires"
const BUCKET_NAME = "galerie_images"
const COLLECTION  = "luminaires_galerie"

export const runtime    = "nodejs"
export const maxDuration = 60

// ─── Action : vider la galerie ────────────────────────────────────────────────

async function handleClear() {
  const client = await clientPromise
  const db     = client.db(DBNAME)
  await db.collection(COLLECTION).deleteMany({})
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
  const files  = await bucket.find({}).toArray()
  await Promise.all(files.map(f => bucket.delete(f._id)))
  return NextResponse.json({ success: true, message: "Galerie vidée" })
}

// ─── Action : uploader une seule image + ses métadonnées ─────────────────────

async function handleImage(formData: FormData) {
  const imgFile  = formData.get("image")    as File | null
  const nom      = (formData.get("nom")      as string || "").trim()
  const designer = (formData.get("designer") as string || "").trim()
  const annee    = (formData.get("annee")    as string || "").trim()
  const filename = (formData.get("filename") as string || "").trim()

  if (!nom) return NextResponse.json({ success: false, error: "Nom manquant" }, { status: 400 })

  const client = await clientPromise
  const db     = client.db(DBNAME)
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
  const col    = db.collection(COLLECTION)

  // Supprimer l'ancienne entrée si filename existe déjà
  const existing = await col.findOne({ filename })
  if (existing?.gridfsId) {
    try { await bucket.delete(new ObjectId(existing.gridfsId as string)) } catch {}
  }

  let imageUrl = ""

  if (imgFile) {
    const buffer = Buffer.from(await imgFile.arrayBuffer())
    const uploadStream = bucket.openUploadStream(filename || imgFile.name, {
      metadata: { contentType: imgFile.type || "image/png" },
    })
    const fileId = uploadStream.id
    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", resolve)
      uploadStream.on("error", reject)
      uploadStream.end(buffer)
    })
    imageUrl = `/api/galerie/images/${fileId}`
  }

  // ── Auto-matching : retrouver le luminaire catalogue par le nom de fichier ──────
  // Supprime le suffixe -removebg-preview et l'extension pour extraire le nom de base
  let luminaire_id: string | null = null
  if (filename) {
    const base = filename
      .replace(/-removebg-preview[^.]*(\.\w+)?$/i, "")   // retire -removebg-preview(...)
      .replace(/\s*\(\d+\)\s*$/, "")                       // retire (1), (2)…
      .replace(/\.[^.]+$/, "")                             // retire l'extension
      .trim()

    if (base) {
      // Échapper les caractères spéciaux pour la regex MongoDB
      const safe = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const found = await db.collection("luminaires").findOne({
        $or: [
          { filename:                                    { $regex: safe, $options: "i" } },
          { "Nom du fichier":                            { $regex: safe, $options: "i" } },
          { "Image luminaire (Nom du fichier)":          { $regex: safe, $options: "i" } },
        ],
      }, { projection: { _id: 1 } })
      if (found) luminaire_id = found._id.toString()
    }
  }

  await col.updateOne(
    { filename },
    {
      $set:         { nom, designer, annee, imageUrl, filename, luminaire_id, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )

  return NextResponse.json({ success: true, matched: !!luminaire_id })
}

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const action   = (formData.get("action") as string || "").trim()

    if (action === "clear") return handleClear()
    if (action === "image") return handleImage(formData)

    return NextResponse.json({ success: false, error: `Action inconnue: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error("❌ /api/galerie/upload:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
