import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { db } = await connectToDatabase()
    const designerName = decodeURIComponent(params.name)

    console.log(`🔍 Recherche du designer: "${designerName}"`)

    // Échapper les caractères spéciaux pour la regex
    const escapedName = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Rechercher d'abord dans la collection designers-data pour l'image
    const designerInfo = await db.collection("designers-data").findOne({
      Nom: { $regex: new RegExp(`^${escapedName}$`, "i") },
    })

    console.log(`👤 Info designer trouvée:`, designerInfo ? "Oui" : "Non")

    // Rechercher les luminaires de ce designer avec plusieurs patterns
    const searchPatterns = [
      { "Artiste / Dates": { $regex: new RegExp(`^${escapedName}$`, "i") } },
      { "Artiste / Dates": { $regex: new RegExp(escapedName, "i") } },
      { designer: { $regex: new RegExp(`^${escapedName}$`, "i") } },
      { designer: { $regex: new RegExp(escapedName, "i") } },
    ]

    let luminaires = []
    for (const pattern of searchPatterns) {
      luminaires = await db.collection("luminaires").find(pattern).toArray()
      if (luminaires.length > 0) {
        console.log(`💡 ${luminaires.length} luminaires trouvés avec le pattern:`, pattern)
        break
      }
    }

    if (luminaires.length === 0) {
      console.log(`❌ Aucun luminaire trouvé pour: "${designerName}"`)
      return NextResponse.json({
        success: false,
        message: "Designer non trouvé",
      })
    }

    // Construire la réponse avec l'image du designer
    const designer = {
      nom: designerName,
      imagedesigner: designerInfo?.imagedesigner || null,
      luminaires: luminaires.map((luminaire) => ({
        ...luminaire,
        image: luminaire["Nom du fichier"] ? `/api/images/filename/${luminaire["Nom du fichier"]}` : null,
      })),
      totalLuminaires: luminaires.length,
    }

    console.log(`✅ Designer trouvé avec ${luminaires.length} luminaires`)

    return NextResponse.json({
      success: true,
      designer,
    })
  } catch (error) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
