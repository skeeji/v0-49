import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { db } = await connectToDatabase()
    const designerName = decodeURIComponent(params.name)

    console.log("🔍 Recherche designer:", designerName)

    // Recherche flexible du designer
    const searchPatterns = [
      designerName,
      designerName
        .replace(/\s*$$[^)]*$$\s*/g, "")
        .trim(), // Enlever les parenthèses
      designerName
        .split("(")[0]
        .trim(), // Prendre seulement la partie avant la parenthèse
      designerName
        .replace(/\s+/g, " ")
        .trim(), // Normaliser les espaces
    ]

    console.log("🔍 Patterns de recherche:", searchPatterns)

    // Chercher les luminaires correspondants
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { "Artiste / Dates": { $in: searchPatterns } },
          { designer: { $in: searchPatterns } },
          // Recherche partielle
          { "Artiste / Dates": { $regex: designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { designer: { $regex: designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés`)

    if (luminaires.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Designer non trouvé",
      })
    }

    // Créer l'objet designer à partir du premier luminaire
    const firstLuminaire = luminaires[0]
    const designerInfo = {
      nom: firstLuminaire["Artiste / Dates"] || firstLuminaire.designer || designerName,
      count: luminaires.length,
      imagedesigner: firstLuminaire.imagedesigner || null,
    }

    console.log("👨‍🎨 Info designer:", designerInfo)

    return NextResponse.json({
      success: true,
      data: {
        designer: designerInfo,
        luminaires: luminaires,
      },
    })
  } catch (error) {
    console.error("❌ Erreur récupération designer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du designer",
      },
      { status: 500 },
    )
  }
}
