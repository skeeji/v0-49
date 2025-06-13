import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const db = await getDatabase()
    const decodedName = decodeURIComponent(params.name)

    const designer = await db.collection("designers").findOne({
      $or: [{ nom: decodedName }, { slug: decodedName }],
    })

    if (!designer) {
      return NextResponse.json({ error: "Designer non trouvé" }, { status: 404 })
    }

    // Récupérer les luminaires du designer
    const luminaires = await db.collection("luminaires").find({ designer: designer.nom }).sort({ annee: -1 }).toArray()

    return NextResponse.json({
      designer,
      luminaires,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération du designer:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
