import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("👨‍🎨 API /api/designers-data - Chargement des données designers")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les luminaires pour calculer les designers
    const luminaires = await db.collection("luminaires").find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés`)

    // Grouper par designer
    const designerGroups: { [key: string]: any } = {}

    luminaires.forEach((luminaire) => {
      const designerName = luminaire["Artiste / Dates"] || "Designer inconnu"

      if (!designerGroups[designerName]) {
        designerGroups[designerName] = {
          nom: designerName,
          count: 0,
          slug: encodeURIComponent(designerName),
          image: null,
        }
      }

      designerGroups[designerName].count++
    })

    // Récupérer les images des designers
    try {
      const designersWithImages = await db.collection("designers").find({}).toArray()
      console.log(`🖼️ ${designersWithImages.length} designers avec images trouvés`)

      designersWithImages.forEach((designerDoc) => {
        if (designerDoc.Nom && designerDoc.imagedesigner) {
          const designerName = designerDoc.Nom
          if (designerGroups[designerName]) {
            designerGroups[designerName].image = `/api/images/filename/${designerDoc.imagedesigner}`
            console.log(`🔗 Image associée pour ${designerName}`)
          }
        }
      })
    } catch (error) {
      console.log("⚠️ Pas d'images de designers disponibles")
    }

    const designers = Object.values(designerGroups).sort((a: any, b: any) => a.nom.localeCompare(b.nom))

    console.log(`✅ ${designers.length} designers uniques trouvés`)

    return NextResponse.json({
      success: true,
      designers,
      total: designers.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur API designers-data:", error)
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
