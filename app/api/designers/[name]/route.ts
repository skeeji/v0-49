import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const db = await getDatabase()

    // Décoder l'URL plusieurs fois si nécessaire et nettoyer
    let designerName = params.name
    console.log(`🔍 Nom brut reçu: "${designerName}"`)

    // Décoder jusqu'à ce qu'il n'y ait plus de changement
    let previousName = ""
    let attempts = 0
    while (designerName !== previousName && attempts < 5) {
      previousName = designerName
      try {
        designerName = decodeURIComponent(designerName)
        console.log(`🔄 Décodage ${attempts + 1}: "${designerName}"`)
      } catch (e) {
        console.log(`❌ Erreur décodage: ${e.message}`)
        break
      }
      attempts++
    }

    // Nettoyer le nom (enlever le point final et espaces)
    designerName = designerName.replace(/\s*\.\s*$/, "").trim()
    console.log(`🧹 Nom nettoyé: "${designerName}"`)

    console.log(`🔍 Recherche du designer: "${designerName}"`)

    // Lister tous les designers pour debug
    const allDesigners = await db.collection("luminaires").distinct("Artiste / Dates")
    console.log(`📋 Tous les designers disponibles:`, allDesigners.slice(0, 10))

    // Rechercher avec des patterns très flexibles
    const searchQueries = [
      { "Artiste / Dates": designerName },
      { "Artiste / Dates": { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      {
        "Artiste / Dates": { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?$`, "i") },
      },
      { "Artiste / Dates": { $regex: new RegExp(designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } },
      { "Artiste / Dates": { $regex: /A\+A.*Cooren/i } },
      { "Artiste / Dates": { $regex: /A.*A.*Cooren/i } },
    ]

    let luminaires = []
    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i]
      console.log(`🔍 Test query ${i + 1}:`, JSON.stringify(query))
      luminaires = await db.collection("luminaires").find(query).toArray()
      console.log(`💡 Query ${i + 1} résultats: ${luminaires.length}`)
      if (luminaires.length > 0) {
        console.log(`✅ Trouvé avec query ${i + 1}`)
        break
      }
    }

    // Si toujours rien, recherche très large
    if (luminaires.length === 0) {
      console.log(`🔍 Recherche très large avec "Cooren"...`)
      luminaires = await db
        .collection("luminaires")
        .find({
          "Artiste / Dates": { $regex: /Cooren/i },
        })
        .toArray()
      console.log(`🔍 Recherche "Cooren" trouvée: ${luminaires.length} résultats`)

      if (luminaires.length > 0) {
        console.log(
          `📋 Premiers résultats Cooren:`,
          luminaires.slice(0, 3).map((l) => l["Artiste / Dates"]),
        )
      }
    }

    // Rechercher dans designers-data
    const designerInfo = await db.collection("designers-data").findOne({
      Nom: { $regex: /Cooren/i },
    })
    console.log(`👤 Info designer "Cooren" trouvée:`, designerInfo ? designerInfo.Nom : "Non")

    if (luminaires.length === 0) {
      console.log(`❌ Aucun luminaire trouvé pour: "${designerName}"`)
      return NextResponse.json({
        success: false,
        message: "Designer non trouvé",
        debug: {
          originalName: params.name,
          decodedName: designerName,
          availableDesigners: allDesigners.slice(0, 5),
        },
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
