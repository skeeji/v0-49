import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    console.log(`👨‍🎨 API /api/designers/${params.name} - Récupération du designer`)

    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 Recherche designer: ${designerName}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const designersCollection = db.collection("designers")
    const luminairesCollection = db.collection("luminaires")

    // Chercher le designer
    const designer = await designersCollection.findOne({
      $or: [
        { nom: designerName },
        { nom: { $regex: new RegExp(designerName, "i") } },
        { slug: designerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      ],
    })

    if (!designer) {
      console.log(`❌ Designer non trouvé: ${designerName}`)
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    console.log(`✅ Designer trouvé: ${designer.nom}`)

    // Chercher les luminaires de ce designer
    const luminaires = await luminairesCollection
      .find({
        $or: [
          { designer: { $regex: new RegExp(designer.nom, "i") } },
          { "Artiste / Dates": { $regex: new RegExp(designer.nom, "i") } },
        ],
      })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ${designer.nom}`)

    // Formater les luminaires
    const formattedLuminaires = luminaires.map((luminaire) => ({
      ...luminaire,
      id: luminaire._id.toString(),
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
      name: luminaire.nom || luminaire["Nom luminaire"],
    }))

    return NextResponse.json({
      success: true,
      designer: {
        ...designer,
        id: designer._id.toString(),
        image: designer.imagedesigner ? `/api/images/filename/${designer.imagedesigner}` : null,
      },
      luminaires: formattedLuminaires,
    })
  } catch (error: any) {
    console.error(`❌ Erreur récupération designer ${params.name}:`, error)
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
