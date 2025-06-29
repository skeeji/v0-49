import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("👨‍🎨 API /api/designers-data - Extraction des designers")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Extraire tous les designers uniques depuis la collection luminaires
    const pipeline = [
      {
        $match: {
          "Artiste / Dates": { $exists: true, $ne: "", $ne: null },
        },
      },
      {
        $group: {
          _id: "$Artiste / Dates",
          count: { $sum: 1 },
          firstLuminaire: { $first: "$$ROOT" },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]

    const designersData = await db.collection("luminaires").aggregate(pipeline).toArray()

    console.log(`📊 ${designersData.length} designers uniques trouvés`)

    // Charger les images des designers depuis la collection designers
    const designersCollection = await db.collection("designers").find({}).toArray()
    const designerImages = new Map()

    designersCollection.forEach((designer) => {
      if (designer.Nom && designer.imagedesigner) {
        designerImages.set(designer.Nom.toLowerCase(), designer.imagedesigner)
      }
    })

    // Créer la liste des designers avec leurs images
    const designers = designersData.map((item) => {
      const designerName = item._id
      const slug = designerName

      // Chercher l'image correspondante
      let image = null
      const nameLower = designerName.toLowerCase()

      // Recherche exacte
      if (designerImages.has(nameLower)) {
        image = `/api/images/filename/${designerImages.get(nameLower)}`
      } else {
        // Recherche partielle
        for (const [key, value] of designerImages.entries()) {
          if (key.includes(nameLower.split(" ")[0]) || nameLower.includes(key.split(" ")[0])) {
            image = `/api/images/filename/${value}`
            break
          }
        }
      }

      return {
        nom: designerName,
        count: item.count,
        image,
        slug,
      }
    })

    console.log(`✅ ${designers.length} designers avec ${designers.filter((d) => d.image).length} images`)

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
        error: "Erreur lors du chargement des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
