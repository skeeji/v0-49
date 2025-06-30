import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const db = await getDatabase()

    // Décoder l'URL
    let designerName = params.name
    try {
      designerName = decodeURIComponent(designerName)
    } catch (e) {
      console.log("Erreur décodage:", e)
    }

    // Nettoyer le nom (enlever le point final)
    designerName = designerName.replace(/\.$/, "").trim()

    console.log(`🔍 Recherche du designer: "${designerName}"`)

    // Rechercher directement dans la collection luminaires
    // (on sait qu'elle existe car la page designers fonctionne avec 9004 luminaires)
    let luminaires = []

    // 1. Recherche exacte
    luminaires = await db
      .collection("luminaires")
      .find({
        "Artiste / Dates": designerName,
      })
      .toArray()
    console.log(`🎯 Recherche exacte: ${luminaires.length} résultats`)

    if (luminaires.length === 0) {
      // 2. Recherche insensible à la casse
      luminaires = await db
        .collection("luminaires")
        .find({
          "Artiste / Dates": { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        })
        .toArray()
      console.log(`🔤 Recherche insensible casse: ${luminaires.length} résultats`)
    }

    if (luminaires.length === 0) {
      // 3. Recherche partielle
      luminaires = await db
        .collection("luminaires")
        .find({
          "Artiste / Dates": { $regex: new RegExp(designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        })
        .toArray()
      console.log(`🔍 Recherche partielle: ${luminaires.length} résultats`)
    }

    if (luminaires.length === 0) {
      // 4. Recherche par nom seulement (avant la parenthèse)
      const nameOnly = designerName.split("(")[0].trim()
      luminaires = await db
        .collection("luminaires")
        .find({
          "Artiste / Dates": { $regex: new RegExp(nameOnly.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        })
        .toArray()
      console.log(`👤 Recherche nom seul "${nameOnly}": ${luminaires.length} résultats`)
    }

    // Rechercher l'image du designer dans designers-data
    const designerInfo = await db.collection("designers-data").findOne({
      Nom: { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    })

    if (luminaires.length === 0) {
      console.log(`❌ Aucun résultat pour: "${designerName}"`)
      return NextResponse.json({
        success: false,
        message: "Designer non trouvé",
      })
    }

    // Construire la réponse
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
