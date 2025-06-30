import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)

    // Nettoyer le nom du designer (enlever le point final s'il existe)
    const cleanDesignerName = designerName.replace(/\.$/, "").trim()

    console.log("🔍 Chargement du designer:", designerName)
    console.log("🧹 Nom nettoyé:", cleanDesignerName)

    const db = await getDatabase()

    // Récupérer tous les designers disponibles pour debug
    const allDesigners = await db.collection("designers").find({}).toArray()
    const availableDesigners = allDesigners.map((d) => d.Nom).filter(Boolean)

    console.log("🔍 Debug info:", {
      searchedName: cleanDesignerName,
      rawName: designerName,
      availableDesigners: availableDesigners.slice(0, 10), // Limiter pour les logs
    })

    // Chercher le designer avec différents patterns
    const designer = await db.collection("designers").findOne({
      $or: [
        { Nom: cleanDesignerName },
        { Nom: designerName },
        { Nom: { $regex: new RegExp(`^${cleanDesignerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { Nom: { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      ],
    })

    if (!designer) {
      console.log("❌ Designer non trouvé")
      return NextResponse.json(
        {
          success: false,
          message: "Designer non trouvé",
          debug: {
            searchedName: cleanDesignerName,
            rawName: designerName,
            availableCount: availableDesigners.length,
          },
        },
        { status: 404 },
      )
    }

    console.log("✅ Designer trouvé:", designer.Nom)

    // Récupérer les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { "Artiste / Dates": cleanDesignerName },
          { "Artiste / Dates": designerName },
          { "Artiste / Dates": designer.Nom },
        ],
      })
      .toArray()

    console.log(`🔍 ${luminaires.length} luminaires trouvés pour ${designer.Nom}`)

    // Formater les luminaires
    const formattedLuminaires = luminaires.map((luminaire) => ({
      ...luminaire,
      image: luminaire["Nom du fichier"] ? `/api/images/filename/${luminaire["Nom du fichier"]}` : "/placeholder.svg",
      name: luminaire["Nom luminaire"] || luminaire.nom || "Sans nom",
    }))

    const result = {
      ...designer,
      luminaires: formattedLuminaires,
      totalLuminaires: formattedLuminaires.length,
      image: designer.imagedesigner ? `/api/images/filename/${designer.imagedesigner}` : null,
    }

    return NextResponse.json({
      success: true,
      designer: result,
    })
  } catch (error) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
