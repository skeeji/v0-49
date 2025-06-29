import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    console.log(`👨‍🎨 API /api/designers/${params.name} - Récupération du designer`)

    const decodedName = decodeURIComponent(params.name)
    console.log(`🔍 Recherche du designer: "${decodedName}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Chercher le designer par nom (insensible à la casse)
    const designer = await collection.findOne({
      nom: { $regex: new RegExp(`^${decodedName}$`, "i") },
    })

    if (!designer) {
      console.log(`❌ Designer non trouvé: ${decodedName}`)
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
        },
        { status: 404 },
      )
    }

    console.log(`✅ Designer trouvé: ${designer.nom}`)

    // Récupérer les luminaires de ce designer
    const luminairesCollection = db.collection("luminaires")
    const luminaires = await luminairesCollection
      .find({
        designer: { $regex: new RegExp(decodedName, "i") },
      })
      .limit(20)
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ce designer`)

    // Transformer les données pour le frontend
    const transformedDesigner = {
      _id: designer._id.toString(),
      nom: designer.nom || "",
      biographie: designer.biographie || "",
      dateNaissance: designer.dateNaissance || "",
      dateDeces: designer.dateDeces || "",
      nationalite: designer.nationalite || "",
      imagedesigner: designer.imagedesigner || "",
      luminaires: luminaires.map((l) => ({
        _id: l._id.toString(),
        nom: l.nom || "",
        annee: l.annee,
        filename: l["Nom du fichier"] || l.filename || "",
      })),
      createdAt: designer.createdAt,
      updatedAt: designer.updatedAt,
    }

    return NextResponse.json({
      success: true,
      designer: transformedDesigner,
    })
  } catch (error: any) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
