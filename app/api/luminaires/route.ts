import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db("luminaires_db")

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const material = searchParams.get("material") || ""
    const year = searchParams.get("year") || ""
    const sortBy = searchParams.get("sortBy") || "nom"
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1
    const getAllForMapping = searchParams.get("getAllForMapping") === "true"

    const query: any = {}

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      query.designer = { $regex: designer, $options: "i" }
    }

    if (material) {
      query.material = { $regex: material, $options: "i" }
    }

    if (year) {
      query.year = Number.parseInt(year)
    }

    const skip = (page - 1) * limit

    // Si on demande tous les luminaires pour le mapping, on ignore la pagination
    if (getAllForMapping) {
      const luminaires = await db
        .collection("luminaires")
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .toArray()

      return NextResponse.json({
        luminaires,
        total: luminaires.length,
        page: 1,
        totalPages: 1,
      })
    }

    const [luminaires, total] = await Promise.all([
      db
        .collection("luminaires")
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("luminaires").countDocuments(query),
    ])

    return NextResponse.json({
      luminaires,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching luminaires:", error)
    return NextResponse.json({ error: "Failed to fetch luminaires" }, { status: 500 })
  }
}
