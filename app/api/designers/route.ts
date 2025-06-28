import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

// Fonction pour créer un slug à partir d'un nom
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, "") // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, "-") // Remplacer espaces par tirets
    .replace(/-+/g, "-") // Éviter les tirets multiples
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/designers appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les luminaires pour extraire les designers
    const luminaires = await db.collection("luminaires").find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés`)

    // Extraire et compter les designers
    const designerCounts: { [key: string]: { name: string; count: number; slug: string } } = {}

    luminaires.forEach((luminaire) => {
      if (luminaire.designer) {
        const designerName = getDesignerNameOnly(luminaire.designer)
        const slug = createSlug(designerName)

        if (designerCounts[designerName]) {
          designerCounts[designerName].count++
        } else {
          designerCounts[designerName] = {
            name: designerName,
            count: 1,
            slug: slug,
          }
        }
      }
    })

    // Convertir en tableau et trier
    const designers = Object.values(designerCounts).sort((a, b) => a.name.localeCompare(b.name))

    console.log(`✅ ${designers.length} designers uniques trouvés`)

    return NextResponse.json({
      success: true,
      designers: designers,
      total: designers.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers:", error)
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
