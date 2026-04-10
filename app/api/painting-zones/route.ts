import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import { inflateSync } from "zlib"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// ─── Parser PNG minimal (RGBA color type 6, bit depth 8) ─────────────────────

function parsePNGAlpha(buf: Buffer): { W: number; H: number; alpha: Uint8Array } | null {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) return null

  let pos = 8, W = 0, H = 0, colorType = -1, bitDepth = 0
  const idats: Buffer[] = []

  while (pos + 12 <= buf.length) {
    const len  = buf.readUInt32BE(pos)
    const type = buf.toString("ascii", pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    pos += 12 + len

    if (type === "IHDR") {
      W         = data.readUInt32BE(0)
      H         = data.readUInt32BE(4)
      bitDepth  = data[8]
      colorType = data[9]
    } else if (type === "IDAT") {
      idats.push(data)
    } else if (type === "IEND") {
      break
    }
  }

  // Seulement RGBA (color type 6) + 8 bits — le plus courant pour les PNG Gemini
  if (colorType !== 6 || bitDepth !== 8 || W === 0 || H === 0) return null

  let raw: Buffer
  try { raw = inflateSync(Buffer.concat(idats)) } catch { return null }

  const stride  = 1 + W * 4  // 1 octet filter + 4 octets/pixel
  const alpha   = new Uint8Array(W * H)
  const prevRow = new Uint8Array(W * 4)
  const curRow  = new Uint8Array(W * 4)

  for (let y = 0; y < H; y++) {
    const base   = y * stride
    const filter = raw[base]
    curRow.set(raw.subarray(base + 1, base + 1 + W * 4))

    // Reconstruction du filtre PNG
    if (filter === 1) {
      for (let i = 4; i < curRow.length; i++) curRow[i] = (curRow[i] + curRow[i - 4]) & 0xff
    } else if (filter === 2) {
      for (let i = 0; i < curRow.length; i++) curRow[i] = (curRow[i] + prevRow[i]) & 0xff
    } else if (filter === 3) {
      for (let i = 0; i < curRow.length; i++) {
        const a = i >= 4 ? curRow[i - 4] : 0
        curRow[i] = (curRow[i] + Math.floor((a + prevRow[i]) / 2)) & 0xff
      }
    } else if (filter === 4) {
      for (let i = 0; i < curRow.length; i++) {
        const a = i >= 4 ? curRow[i - 4] : 0
        const b = prevRow[i]
        const c = i >= 4 ? prevRow[i - 4] : 0
        const p = a + b - c
        const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a
          : Math.abs(p - b) <= Math.abs(p - c) ? b : c
        curRow[i] = (curRow[i] + pr) & 0xff
      }
    }

    for (let x = 0; x < W; x++) alpha[y * W + x] = curRow[x * 4 + 3]
    prevRow.set(curRow)
  }

  return { W, H, alpha }
}

// ─── BFS sur pixels transparents (alpha < 128) ────────────────────────────────

function bfsZones(alpha: Uint8Array, W: number, H: number, minPx = 400) {
  const visited = new Uint8Array(W * H)
  const zones: { id: number; bbox: { x: number; y: number; w: number; h: number } }[] = []

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si] || alpha[si] >= 128) continue

      const q: number[] = [si]
      visited[si] = 1
      let qi = 0, x0 = sx, x1 = sx, y0 = sy, y1 = sy, size = 0

      while (qi < q.length) {
        const ci = q[qi++]; size++
        const cy = (ci / W) | 0, cx = ci % W
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy

        if (cx > 0)     { const n = ci - 1; if (!visited[n] && alpha[n] < 128) { visited[n] = 1; q.push(n) } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n] && alpha[n] < 128) { visited[n] = 1; q.push(n) } }
        if (cy > 0)     { const n = ci - W; if (!visited[n] && alpha[n] < 128) { visited[n] = 1; q.push(n) } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n] && alpha[n] < 128) { visited[n] = 1; q.push(n) } }
      }

      if (size >= minPx)
        zones.push({ id: zones.length, bbox: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } })
    }
  }

  return zones.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
}

// ─── Route GET ────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = await clientPromise
    const db     = client.db(DBNAME)

    const file = await db.collection("uploads.files").findOne(
      { "metadata.homepageKey": "homepage_painting_transparent" },
      { sort: { "metadata.uploadDate": -1 } }
    )

    if (!file) {
      return NextResponse.json({ success: false, error: "Image non uploadée" }, { status: 404 })
    }

    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      const s = bucket.openDownloadStream(file._id)
      s.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      s.on("end",  resolve)
      s.on("error", reject)
    })

    const parsed = parsePNGAlpha(Buffer.concat(chunks))
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Le PNG doit être en mode RGBA (transparence)" }, { status: 422 })
    }

    const { W, H, alpha } = parsed
    const zones = bfsZones(alpha, W, H)
    console.log(`[painting-zones] ${zones.length} zone(s) — ${W}×${H}`)

    return NextResponse.json(
      { success: true, width: W, height: H, zones },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    )
  } catch (err: any) {
    console.error("❌ /api/painting-zones:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
