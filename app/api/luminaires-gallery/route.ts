import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Db, GridFSBucket } from "mongodb"
import sharp from "sharp"

const DBNAME        = process.env.MONGO_INITDB_DATABASE || "gersaint"
const IMAGES_DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

const WHITE_THRESHOLD = 230
const SAMPLE_SIZE     = 100   // resize image to this before corner sampling
const CORNER_OFFSET   = 5     // pixels from edge in the 100×100 sample
const BATCH_SIZE      = 10    // concurrent sharp calls
const FETCH_TIMEOUT   = 6_000 // ms per image

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (c) => chunks.push(Buffer.from(c)))
    stream.on("end",  ()  => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

async function hasWhiteBackground(
  imagesDb: Db,
  bucket: GridFSBucket,
  filename: string
): Promise<boolean> {
  try {
    const variants = [
      filename,
      filename.toLowerCase(),
      filename.toUpperCase(),
      filename.replace(/\.[^/.]+$/, ""),
      `${filename.replace(/\.[^/.]+$/, "")}.jpg`,
      `${filename.replace(/\.[^/.]+$/, "")}.jpeg`,
      `${filename.replace(/\.[^/.]+$/, "")}.png`,
    ]

    const file = await imagesDb
      .collection("uploads.files")
      .findOne({ $or: variants.map((v) => ({ filename: v })) })

    if (!file) return true   // image introuvable → inclure par défaut

    const downloadStream = bucket.openDownloadStream(file._id as any)

    const buffer = await Promise.race([
      streamToBuffer(downloadStream),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT)
      ),
    ])

    // Resize to SAMPLE_SIZE×SAMPLE_SIZE, flatten transparency → white
    const { data } = await sharp(buffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true })

    // stride = SAMPLE_SIZE * 3 bytes (RGB)
    const stride = SAMPLE_SIZE * 3
    const o      = CORNER_OFFSET
    const end    = SAMPLE_SIZE - 1 - CORNER_OFFSET

    const corners = [
      o   * stride + o   * 3,   // top-left
      o   * stride + end * 3,   // top-right
      end * stride + o   * 3,   // bottom-left
      end * stride + end * 3,   // bottom-right
    ]

    for (const idx of corners) {
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      if (r <= WHITE_THRESHOLD || g <= WHITE_THRESHOLD || b <= WHITE_THRESHOLD) {
        return false   // fond non blanc → rejeter
      }
    }
    return true   // tous les coins > 230 → fond blanc/crème
  } catch {
    return true   // erreur réseau / timeout → inclure par défaut
  }
}

export async function GET() {
  try {
    const client    = await clientPromise
    const db        = client.db(DBNAME)
    const imagesDb  = client.db(IMAGES_DBNAME)
    const bucket    = new GridFSBucket(imagesDb, { bucketName: "uploads" })
    const collection = db.collection("luminaires")

    const luminaires = await collection
      .find(
        {
          $or: [
            { filename: { $exists: true, $nin: [null, ""] } },
            { "Image luminaire (Nom du fichier)": { $exists: true, $nin: [null, ""] } },
          ],
        },
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

    // Build items with resolved filename
    const rawItems = luminaires
      .map((l) => {
        const filename =
          l.filename ||
          l["Image luminaire (Nom du fichier)"] ||
          l["Nom du fichier"]
        if (!filename) return null
        return {
          _id:      String(l._id),
          nom:      l.nom || l["Nom luminaire"] || "Luminaire",
          designer: l.designer || l["Artiste / Dates"] || "",
          annee:    l.annee || l["Année"] || "",
          imageUrl: `/api/images/filename/${filename}`,
          _filename: filename as string,
        }
      })
      .filter(Boolean) as Array<{
        _id: string
        nom: string
        designer: string
        annee: string
        imageUrl: string
        _filename: string
      }>

    // Filter by white/cream background — batched to limit concurrency
    const keep: boolean[] = new Array(rawItems.length)

    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      const batch = rawItems.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map((item) => hasWhiteBackground(imagesDb, bucket, item._filename))
      )
      results.forEach((ok, j) => { keep[i + j] = ok })
    }

    const items = rawItems
      .filter((_, i) => keep[i])
      .map(({ _filename: _f, ...rest }) => rest)   // strip internal field

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
