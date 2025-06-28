import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 Recherche du designer: "${designerName}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher d'abord dans la collection designers
    let designer = await db.collection("designers").findOne({
      $or: [{ nom: designerName }, { slug: designerName }, { nom: { $regex: new RegExp(`^${designerName}`, "i") } }],
    })

    console.log("👨‍🎨 Designer trouvé dans la collection designers:", designer ? "Oui" : "Non")

    // Si pas trouvé, créer un designer basique à partir des luminaires
    if (!designer) {
      const luminaires = await db
        .collection("luminaires")
        .find({ designer: { $regex: new RegExp(designerName, "i") } })
        .toArray()

      if (luminaires.length > 0) {
        const firstLuminaire = luminaires[0]
        designer = {
          nom: getDesignerNameOnly(firstLuminaire.designer),
          slug: designerName,
          imagedesigner: "", // Pas d'image par défaut
          count: luminaires.length,
        }
        console.log("👨‍🎨 Designer créé à partir des luminaires")
      }
    } else {
      // Compter les luminaires pour ce designer
      const luminairesCount = await db
        .collection("luminaires")
        .countDocuments({ designer: { $regex: new RegExp(designer.nom, "i") } })

      designer.count = luminairesCount
    }

    if (!designer) {
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
        },
        { status: 404 },
      )
    }

    // Récupérer les luminaires du designer
    const luminaires = await db
      .collection("luminaires")
      .find({ designer: { $regex: new RegExp(designer.nom, "i") } })
      .sort({ nom: 1 })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ${designer.nom}`)

    // Transformer les luminaires
    const transformedLuminaires = luminaires.map((luminaire) => ({
      ...luminaire,
      _id: luminaire._id.toString(),
      images: luminaire.images || [],
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      filename: luminaire.filename || "",
    }))

    return NextResponse.json({
      success: true,
      data: {
        designer: {
          ...designer,
          _id: designer._id ? designer._id.toString() : null,
        },
        luminaires: transformedLuminaires,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers/[name]:", error)
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
