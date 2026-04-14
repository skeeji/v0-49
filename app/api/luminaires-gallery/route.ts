import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Db, GridFSBucket } from "mongodb"
import { unzipSync } from "zlib"

const DBNAME        = process.env.MONGO_INITDB_DATABASE || "gersaint"
const IMAGES_DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

const WHITE_THRESHOLD = 230
const CORNER_OFFSET   = 5           // px from edge in the original image
const BATCH_SIZE      = 10          // max concurrent GridFS reads
const FETCH_TIMEOUT   = 6_000       // ms per image
const MAX_IMAGE_SIZE  = 20_971_520  // 20 MB — skip check above this size

// ─── Pure-JS PNG corner reader (Node built-in zlib only) ─────────────────────

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/**
 * Reads the 4 corner pixels of a PNG buffer at `off` pixels from each edge.
 * Returns an array of [R, G, B] composited over white, or null if the format
 * is unsupported / parsing fails (caller should include the image by default).
 */
function pngCorners(buf: Buffer, off: number): [number, number, number][] | null {
  // PNG magic bytes
  if (
    buf.length < 8 ||
    buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47 ||
    buf[4] !== 0x0d || buf[5] !== 0x0a || buf[6] !== 0x1a || buf[7] !== 0x0a
  ) return null

  let pos = 8
  let width = 0, height = 0, channels = 0, interlace = 0
  const idats: Buffer[] = []

  while (pos + 12 <= buf.length) {
    const chunkLen  = buf.readUInt32BE(pos)
    const chunkType = buf.subarray(pos + 4, pos + 8).toString("ascii")

    if (chunkType === "IHDR") {
      width     = buf.readUInt32BE(pos + 8)
      height    = buf.readUInt32BE(pos + 12)
      const bit = buf[pos + 16]
      const ct  = buf[pos + 17]
      interlace = buf[pos + 21]
      // Only support 8-bit non-interlaced RGB / RGBA / Grayscale / Grayscale+Alpha
      if (bit !== 8 || interlace !== 0) return null
      channels = ct === 2 ? 3 : ct === 6 ? 4 : ct === 0 ? 1 : ct === 4 ? 2 : 0
      if (!channels) return null   // palette or unknown — skip
    } else if (chunkType === "IDAT") {
      idats.push(buf.subarray(pos + 8, pos + 8 + chunkLen))
    } else if (chunkType === "IEND") {
      break
    }

    pos += 12 + chunkLen
  }

  if (!width || !height || !channels) return null
  if (width <= off * 2 || height <= off * 2) return null

  let decomp: Buffer
  try { decomp = unzipSync(Buffer.concat(idats)) } catch { return null }

  const stride = 1 + width * channels   // 1 filter byte + pixel bytes per row
  if (decomp.length < stride * height)  return null

  const prev = new Uint8Array(width * channels)
  const curr = new Uint8Array(width * channels)

  // Rows we care about: top corner row and bottom corner row
  const topRow = off
  const botRow = height - 1 - off
  const saved  = new Map<number, Uint8Array>()

  for (let y = 0; y <= botRow; y++) {
    const base = y * stride
    const ft   = decomp[base]

    for (let x = 0; x < width * channels; x++) {
      const raw = decomp[base + 1 + x]
      const a   = x >= channels ? curr[x - channels] : 0   // left
      const b   = prev[x]                                    // above
      const c   = x >= channels ? prev[x - channels] : 0   // above-left
      curr[x]   = (raw + (
        ft === 1 ? a :
        ft === 2 ? b :
        ft === 3 ? (a + b) >> 1 :
        ft === 4 ? paethPredictor(a, b, c) : 0
      )) & 0xff
    }

    if (y === topRow || y === botRow) saved.set(y, curr.slice())
    prev.set(curr)
  }

  // Composite a channel over white: result = src·α + 255·(1−α)
  const blendWhite = (ch: number, a: number) =>
    Math.round(ch * a / 255 + 255 * (255 - a) / 255)

  const getRGB = (row: Uint8Array, x: number): [number, number, number] => {
    const i = x * channels
    if (channels <= 2) {
      const g = row[i], a = channels === 2 ? row[i + 1] : 255
      const v = blendWhite(g, a)
      return [v, v, v]
    }
    const r = row[i], g = row[i + 1], b = row[i + 2]
    const a = channels === 4 ? row[i + 3] : 255
    return [blendWhite(r, a), blendWhite(g, a), blendWhite(b, a)]
  }

  const top = saved.get(topRow)
  const bot = saved.get(botRow)
  if (!top || !bot) return null

  return [
    getRGB(top, off),                 // top-left
    getRGB(top, width  - 1 - off),   // top-right
    getRGB(bot, off),                 // bottom-left
    getRGB(bot, width  - 1 - off),   // bottom-right
  ]
}

// ─── GridFS helpers ───────────────────────────────────────────────────────────

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data",  (c) => chunks.push(Buffer.from(c)))
    stream.on("end",   ()  => resolve(Buffer.concat(chunks)))
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

    const stream = bucket.openDownloadStream(file._id as any)

    const buffer = await Promise.race([
      streamToBuffer(stream),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT)
      ),
    ])

    // Image too large or not PNG → include by default (no JPEG support without native lib)
    if (buffer.length > MAX_IMAGE_SIZE) return true

    const corners = pngCorners(buffer, CORNER_OFFSET)
    if (!corners) return true   // non-PNG or unsupported → include par défaut

    for (const [r, g, b] of corners) {
      if (r <= WHITE_THRESHOLD || g <= WHITE_THRESHOLD || b <= WHITE_THRESHOLD) {
        return false   // fond non blanc/crème → rejeter
      }
    }
    return true   // les 4 coins > 230 sur les 3 canaux → fond blanc/crème
  } catch {
    return true   // erreur réseau / timeout / corruption → inclure par défaut
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client     = await clientPromise
    const db         = client.db(DBNAME)
    const imagesDb   = client.db(IMAGES_DBNAME)
    const bucket     = new GridFSBucket(imagesDb, { bucketName: "uploads" })
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

    const rawItems = luminaires
      .map((l) => {
        const filename =
          l.filename ||
          l["Image luminaire (Nom du fichier)"] ||
          l["Nom du fichier"]
        if (!filename) return null
        return {
          _id:       String(l._id),
          nom:       l.nom || l["Nom luminaire"] || "Luminaire",
          designer:  l.designer || l["Artiste / Dates"] || "",
          annee:     l.annee || l["Année"] || "",
          imageUrl:  `/api/images/filename/${filename}`,
          _filename: filename as string,
        }
      })
      .filter(Boolean) as Array<{
        _id: string; nom: string; designer: string; annee: string
        imageUrl: string; _filename: string
      }>

    // Vérification fond blanc/crème — par batches pour limiter la concurrence
    const keep: boolean[] = new Array(rawItems.length)

    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      const batch   = rawItems.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map((item) => hasWhiteBackground(imagesDb, bucket, item._filename))
      )
      results.forEach((ok, j) => { keep[i + j] = ok })
    }

    const items = rawItems
      .filter((_, i) => keep[i])
      .map(({ _filename: _f, ...rest }) => rest)

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
