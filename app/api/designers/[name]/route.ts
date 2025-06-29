import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 API /api/designers/${designerName} - Recherche designer`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { "Artiste / Dates": { $regex: designerName, $options: "i" } },
          { designer: { $regex: designerName, $options: "i" } },
        ],
      })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ${designerName}`)

    if (luminaires.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
        },
        { status: 404 },
      )
    }

    // Créer l'objet designer à partir du premier luminaire
    const firstLuminaire = luminaires[0]
    const designer = {
      nom: designerName,
      count: luminaires.length,
      imagedesigner: firstLuminaire.imagedesigner || null,
    }

    // Chercher dans la collection designers si elle existe
    try {
      const designerDoc = await db.collection("designers").findOne({
        $or: [{ nom: designerName }, { nom: { $regex: designerName, $options: "i" } }],
      })

      if (designerDoc) {
        designer.imagedesigner = designerDoc.imagedesigner || designer.imagedesigner
        console.log(`✅ Designer trouvé dans la collection designers: ${designerDoc.nom}`)
      }
    } catch (error) {
      console.log("⚠️ Collection designers non trouvée, utilisation des données des luminaires")
    }

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires,
      },
    })
  } catch (error: any) {
    console.error(`❌ Erreur API designers/${params.name}:`, error)
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
