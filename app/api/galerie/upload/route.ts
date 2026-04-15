import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME      = process.env.MONGO_INITDB_DATABASE || "luminaires"
const BUCKET_NAME = "galerie_images"
const COLLECTION  = "luminaires_galerie"

export const runtime = "nodejs"
export const maxDuration = 60

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let cur = "", inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "")]))
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const csvFile  = formData.get("csv")    as File | null
    const action   = formData.get("action") as string | null

    // ── Vider la galerie ──────────────────────────────────────────────────────────
    if (action === "clear") {
      const client = await clientPromise
      const db     = client.db(DBNAME)
      await db.collection(COLLECTION).deleteMany({})
      const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
      const files  = await bucket.find({}).toArray()
      await Promise.all(files.map(f => bucket.delete(f._id)))
      return NextResponse.json({ success: true, message: "Galerie vidée" })
    }

    if (!csvFile) return NextResponse.json({ error: "CSV manquant" }, { status: 400 })

    // ── Parser le CSV ─────────────────────────────────────────────────────────────
    const rows = parseCSV(await csvFile.text())
    if (rows.length === 0) return NextResponse.json({ error: "CSV vide ou invalide" }, { status: 400 })

    // ── Construire la map filename → File depuis les images uploadées ─────────────
    const imageMap = new Map<string, File>()
    const entries = Array.from(formData.entries() as unknown as [string, FormDataEntryValue][])
    for (const [key, val] of entries) {
      if (key === "images" && val instanceof File) imageMap.set(val.name, val)
    }

    const client = await clientPromise
    const db     = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
    const col    = db.collection(COLLECTION)

    const results = { inserted: 0, skipped: 0, errors: [] as string[] }

    for (const row of rows) {
      const filename = (row.image || "").trim()
      const nom      = (row.nom   || "").trim()

      if (!nom) { results.errors.push(`Ligne sans nom ignorée`); results.skipped++; continue }

      // Chercher le fichier image dans la map
      const imgFile = imageMap.get(filename)
      if (!imgFile && filename) {
        results.errors.push(`Image manquante : ${filename}`)
        results.skipped++
        continue
      }

      let imageUrl = ""

      if (imgFile) {
        // Supprimer l'ancienne entrée si même filename existe déjà
        const existing = await col.findOne({ filename })
        if (existing?.gridfsId) {
          try { await bucket.delete(new ObjectId(existing.gridfsId as string)) } catch {}
        }

        // Upload dans GridFS
        const buffer = Buffer.from(await imgFile.arrayBuffer())
        const uploadStream = bucket.openUploadStream(filename, {
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

      // Upsert dans la collection
      await col.updateOne(
        { filename },
        {
          $set: {
            nom,
            designer:  (row.designer || "").trim(),
            annee:     (row.annee    || "").trim(),
            imageUrl,
            filename,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )

      results.inserted++
    }

    return NextResponse.json({ success: true, ...results })
  } catch (err: any) {
    console.error("❌ /api/galerie/upload:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
