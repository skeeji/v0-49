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

    // Échapper les caractères spéciaux pour la regex
    const escapedName = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    console.log(`🔒 Nom échappé: "${escapedName}"`)

    // Rechercher d'abord dans la collection designers-data pour l'image
    const designerInfo = await db.collection("designers-data").findOne({
      Nom: { $regex: new RegExp(`^${escapedName}$`, "i") },
    })

    console.log(`👤 Info designer trouvée:`, designerInfo ? "Oui" : "Non")

    // Rechercher les luminaires de ce designer avec plusieurs patterns
    const searchPatterns = [
      { "Artiste / Dates": { $regex: new RegExp(`^${escapedName}$`, "i") } },
      { "Artiste / Dates": { $regex: new RegExp(`^${escapedName}\\.?$`, "i") } }, // Avec point optionnel
      { "Artiste / Dates": { $regex: new RegExp(escapedName, "i") } },
      { designer: { $regex: new RegExp(`^${escapedName}$`, "i") } },
      { designer: { $regex: new RegExp(escapedName, "i") } },
    ]

    let luminaires = []
    for (let i = 0; i < searchPatterns.length; i++) {
      const pattern = searchPatterns[i]
      console.log(`🔍 Test pattern ${i + 1}:`, pattern)
      luminaires = await db.collection("luminaires").find(pattern).toArray()
      if (luminaires.length > 0) {
        console.log(`💡 ${luminaires.length} luminaires trouvés avec le pattern ${i + 1}`)
        break
      }
    }

    // Si toujours rien, essayer une recherche plus large
    if (luminaires.length === 0) {
      console.log(`🔍 Recherche élargie...`)
      const broadSearch = await db
        .collection("luminaires")
        .find({
          $or: [
            { "Artiste / Dates": { $regex: new RegExp(designerName.split(" ")[0], "i") } },
            { designer: { $regex: new RegExp(designerName.split(" ")[0], "i") } },
          ],
        })
        .toArray()
      console.log(`🔍 Recherche élargie trouvée: ${broadSearch.length} résultats`)

      // Filtrer pour trouver les correspondances les plus proches
      luminaires = broadSearch.filter((lum) => {
        const artistField = lum["Artiste / Dates"] || lum.designer || ""
        return (
          artistField.toLowerCase().includes(designerName.toLowerCase()) ||
          designerName.toLowerCase().includes(artistField.toLowerCase())
        )
      })
      console.log(`🎯 Après filtrage: ${luminaires.length} résultats`)
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
