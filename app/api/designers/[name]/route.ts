import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log("🔍 Recherche designer:", designerName)

    const { db } = await connectToDatabase()

    // Recherche flexible du designer avec échappement des caractères spéciaux
    const escapedName = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Essayer plusieurs patterns de recherche
    const searchPatterns = [
      new RegExp(`^${escapedName}$`, "i"), // Correspondance exacte
      new RegExp(escapedName, "i"), // Contient le nom
      new RegExp(`^${escapedName.split(" ")[0]}`, "i"), // Premier mot
    ]

    let designer = null
    for (const pattern of searchPatterns) {
      designer = await db.collection("designers").findOne({ nom: pattern })
      if (designer) break
    }

    if (!designer) {
      console.log("❌ Designer non trouvé:", designerName)
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    console.log("✅ Designer trouvé:", designer.nom)

    // Récupérer les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [{ designer: new RegExp(escapedName, "i") }, { "Artiste / Dates": new RegExp(escapedName, "i") }],
      })
      .toArray()

    console.log(`💡 ${luminaires.length} luminaires trouvés pour ${designer.nom}`)

    // Inclure l'image du designer dans la réponse
    const designerWithLuminaires = {
      ...designer,
      imagedesigner: designer.imagedesigner, // S'assurer que l'image est incluse
      luminaires: luminaires.map((lum) => ({
        ...lum,
        id: lum._id.toString(),
      })),
      totalLuminaires: luminaires.length,
    }

    return NextResponse.json({
      success: true,
      designer: designerWithLuminaires,
    })
  } catch (error) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
