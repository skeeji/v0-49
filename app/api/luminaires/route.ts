import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API /api/luminaires - Récupération des luminaires")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés`)

    // ÉTAPE 2 : Logique bilingue avec fallback robuste
    const formattedLuminaires = luminaires.map((luminaire) => {
      // Logique de secours pour chaque champ
      const nom = luminaire.nom || luminaire["Nom luminaire"] || ""
      const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
      const annee = luminaire.annee || luminaire["Année"] || ""
      const editeur = luminaire.editeur || ""
      const periode = luminaire.periode || luminaire["Spécialité"] || ""
      const collaboration = luminaire.collaboration || luminaire["Collaboration / Œuvre"] || ""
      const description = luminaire.description || ""
      const signe = luminaire.signe || luminaire["Signé"] || ""
      const dimensions = luminaire.dimensions || ""
      const estimation = luminaire.estimation || luminaire.Prix || ""

      // Matériaux toujours un tableau
      const materiaux = luminaire.materiaux || []

      // PROTECTION ABSOLUE : Ne pas modifier ces lignes (logique d'images)
      const image = luminaire.filename
        ? `/api/images/filename/${encodeURIComponent(luminaire.filename)}`
        : luminaire.images && luminaire.images.length > 0
          ? `/api/images/filename/${encodeURIComponent(luminaire.images[0])}`
          : null

      const designerImage = luminaire.designerImageFilename
        ? `/api/images/filename/${encodeURIComponent(luminaire.designerImageFilename)}`
        : null

      return {
        _id: luminaire._id,
        nom,
        designer,
        annee,
        editeur,
        periode,
        collaboration,
        description,
        signe,
        dimensions,
        materiaux,
        estimation,
        image,
        designerImage,
        images: luminaire.images || [],
        designerImageFilename: luminaire.designerImageFilename || null,
      }
    })

    return NextResponse.json({
      success: true,
      luminaires: formattedLuminaires,
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("➕ API /api/luminaires - Création d'un luminaire")

    const body = await request.json()
    console.log("📝 Données reçues:", body)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Créer le luminaire avec les données standardisées
    const luminaireData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(luminaireData)
    console.log("✅ Luminaire créé avec ID:", result.insertedId)

    // Récupérer le luminaire créé
    const createdLuminaire = await collection.findOne({ _id: result.insertedId })

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      luminaire: createdLuminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
