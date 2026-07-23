import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { ProgressRow } from "@/app/admin/english-coach/types"

const COLLECTION = "coach_progress"

export async function GET() {
  try {
    const db = await getDatabase()
    const rows = await db.collection(COLLECTION).find({}).toArray()

    const progress: ProgressRow[] = rows.map((r) => ({
      word_id: r.word_id,
      mastery: r.mastery ?? 0,
      wrong_count: r.wrong_count ?? 0,
      times_shown: r.times_shown ?? 0,
      last_seen: r.last_seen ?? "",
    }))

    return NextResponse.json({ success: true, progress })
  } catch (error: any) {
    console.error("[progress] ❌ Erreur GET:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const word_id = String(body.word_id || "")
    if (!word_id) {
      return NextResponse.json({ success: false, error: "word_id requis" }, { status: 400 })
    }

    const mastery = Math.min(Math.max(Number(body.mastery) || 0, 0), 5)
    const wrong_count = Math.max(Number(body.wrong_count) || 0, 0)
    const times_shown = Math.max(Number(body.times_shown) || 0, 0)
    const last_seen = new Date().toISOString()

    const db = await getDatabase()
    await db.collection(COLLECTION).updateOne(
      { word_id },
      { $set: { word_id, mastery, wrong_count, times_shown, last_seen } },
      { upsert: true },
    )

    return NextResponse.json({ success: true, progress: { word_id, mastery, wrong_count, times_shown, last_seen } })
  } catch (error: any) {
    console.error("[progress] ❌ Erreur POST:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const db = await getDatabase()
    await db.collection(COLLECTION).deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[progress] ❌ Erreur DELETE:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
