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

    // Vérifier la connexion à la base de données
    const collections = await db.listCollections().toArray()
    console.log(
      "📋 Collections disponibles:",
      collections.map((c) => c.name),
    )

    // Vérifier si la collection luminaires existe
    const luminairesExists = collections.some((c) => c.name === "luminaires")
    console.log("💡 Collection luminaires existe:", luminairesExists)

    if (!luminairesExists) {
      return NextResponse.json({
        success: false,
        message: "Collection luminaires introuvable",
        debug: {
          collections: collections.map((c) => c.name),
        },
      })
    }

    // Compter les documents dans la collection
    const totalCount = await db.collection("luminaires").countDocuments()
    console.log("📊 Total documents luminaires:", totalCount)

    if (totalCount === 0) {
      return NextResponse.json({
        success: false,
        message: "Collection luminaires vide",
      })
    }

    // Récupérer quelques exemples pour voir la structure
    const sampleLuminaires = await db.collection("luminaires").find({}).limit(5).toArray()
    console.log(
      "📋 Exemples de luminaires:",
      sampleLuminaires.map((l) => ({
        id: l._id,
        artiste: l["Artiste / Dates"],
        keys: Object.keys(l),
      })),
    )

    // Rechercher avec différentes approches
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

    // Rechercher l'image du designer
    const designerInfo = await db.collection("designers-data").findOne({
      Nom: { $regex: new RegExp(`^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    })

    if (luminaires.length === 0) {
      // Lister tous les designers disponibles pour debug
      const allDesigners = await db.collection("luminaires").distinct("Artiste / Dates")
      console.log(`❌ Aucun résultat. Total designers uniques: ${allDesigners.length}`)
      console.log(`📋 Premiers designers disponibles:`, allDesigners.slice(0, 10))

      return NextResponse.json({
        success: false,
        message: "Designer non trouvé",
        debug: {
          searchedFor: designerName,
          totalDesigners: allDesigners.length,
          availableDesigners: allDesigners.slice(0, 10),
          totalLuminaires: totalCount,
        },
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
