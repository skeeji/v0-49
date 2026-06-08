import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"
const COL = "conversations"

// GET /api/conversations?uid=...
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid")
  if (!uid) return NextResponse.json({ conversations: [] })

  try {
    const db = (await clientPromise).db(DBNAME)
    const docs = await db
      .collection(COL)
      .find({ uid })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json({
      conversations: docs.map((d) => ({ ...d, _id: d._id.toString() })),
    })
  } catch (err) {
    console.error("[conversations GET]", err)
    return NextResponse.json({ conversations: [] })
  }
}

// POST /api/conversations  { uid, conversation }
// Creates or fully replaces a conversation document (upsert by conversation.id)
export async function POST(request: NextRequest) {
  try {
    const { uid, conversation } = await request.json()
    if (!uid || !conversation?.id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const db = (await clientPromise).db(DBNAME)
    await db.collection(COL).updateOne(
      { uid, id: conversation.id },
      { $set: { uid, ...conversation, updatedAt: new Date() } },
      { upsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[conversations POST]", err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

// DELETE /api/conversations?uid=...&id=...
export async function DELETE(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid")
  const id = request.nextUrl.searchParams.get("id")
  if (!uid || !id) return NextResponse.json({ success: false }, { status: 400 })

  try {
    const db = (await clientPromise).db(DBNAME)
    await db.collection(COL).deleteOne({ uid, id })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[conversations DELETE]", err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
