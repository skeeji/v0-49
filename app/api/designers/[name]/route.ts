import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 Recherche designer: "${designerName}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Échapper les caractères spéciaux pour la regex
    const escapedName = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Essayer plusieurs patterns de recherche
    const searchPatterns = [
      { nom: designerName }, // Correspondance exacte
      { nom: { $regex: `^${escapedName}$`, $options: "i" } }, // Insensible à la casse
      { nom: { $regex: escapedName, $options: "i" } }, // Contient le nom
      { slug: designerName }, // Par slug
      { slug: { $regex: `^${escapedName}$`, $options: "i" } }, // Slug insensible à la casse
    ]

    let designer = null
    for (const pattern of searchPatterns) {
      designer = await db.collection("designers").findOne(pattern)
      if (designer) {
        console.log(`✅ Designer trouvé avec pattern:`, pattern)
        break
      }
    }

    if (!designer) {
      console.log(`❌ Designer non trouvé: "${designerName}"`)
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    // Récupérer les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { "Artiste / Dates": designer.nom },
          { designer: designer.nom },
          { "Artiste / Dates": { $regex: escapedName, $options: "i" } },
        ],
      })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ${designer.nom}`)

    // Inclure l'image du designer dans la réponse
    const response = {
      success: true,
      designer: {
        ...designer,
        imagedesigner: designer.imagedesigner || null, // S'assurer que l'image est incluse
        luminairesCount: luminaires.length,
      },
      luminaires: luminaires,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API designer:", error)
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
