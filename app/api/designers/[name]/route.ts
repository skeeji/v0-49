import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 API /api/designers/${designerName} - Recherche designer`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher les luminaires de ce designer dans la colonne "Artiste / Dates"
    const luminaires = await db
      .collection("luminaires")
      .find({
        "Artiste / Dates": { $regex: designerName, $options: "i" },
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

    // Chercher l'image du designer dans la collection designers
    let designerImage = null
    try {
      const designerDoc = await db.collection("designers").findOne({
        Nom: { $regex: designerName, $options: "i" },
      })

      if (designerDoc && designerDoc.imagedesigner) {
        designerImage = `/api/images/filename/${designerDoc.imagedesigner}`
        console.log(`✅ Image designer trouvée: ${designerDoc.imagedesigner}`)
      }
    } catch (error) {
      console.log("⚠️ Pas d'image trouvée pour ce designer")
    }

    // Créer l'objet designer
    const designer = {
      nom: designerName,
      count: luminaires.length,
      image: designerImage,
      biographie: "",
      specialites: [],
    }

    // Adapter les luminaires pour l'affichage
    const adaptedLuminaires = luminaires.map((lum: any) => ({
      ...lum,
      id: lum._id,
      image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
      name: lum["Nom luminaire"] || "Sans nom",
      year: lum["Année"] || "",
    }))

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires: adaptedLuminaires,
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
