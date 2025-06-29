import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerSlug = decodeURIComponent(params.name)
    console.log("🔍 API /api/designers/[name] GET - Slug:", designerSlug)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        designer: { $regex: designerSlug, $options: "i" },
      })
      .toArray()

    if (!luminaires || luminaires.length === 0) {
      console.log("❌ Aucun luminaire trouvé pour le designer:", designerSlug)
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    // Créer les informations du designer à partir du premier luminaire
    const firstLuminaire = luminaires[0]
    const designerName = getDesignerNameOnly(firstLuminaire.designer)

    const designer = {
      nom: designerName,
      count: luminaires.length,
      imagedesigner: firstLuminaire.imagedesigner || "",
    }

    console.log(`✅ Designer trouvé: ${designerName} avec ${luminaires.length} luminaires`)

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers/[name]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
