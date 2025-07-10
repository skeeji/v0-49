import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerName = decodeURIComponent(params.name)
    console.log(`🔍 API /api/designers/${designerName} - Recherche designer`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Recherche très flexible pour gérer tous les cas, y compris les caractères spéciaux
    const searchPatterns = [
      // Recherche exacte dans "Artiste / Dates"
      { "Artiste / Dates": designerName },
      // Recherche exacte dans "designer"
      { designer: designerName },
      // Recherche insensible à la casse dans "Artiste / Dates"
      { "Artiste / Dates": { $regex: `^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      // Recherche insensible à la casse dans "designer"
      { designer: { $regex: `^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      // Recherche partielle dans "Artiste / Dates"
      { "Artiste / Dates": { $regex: designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      // Recherche partielle dans "designer"
      { designer: { $regex: designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      // Recherche en supprimant les caractères spéciaux dans "Artiste / Dates"
      { "Artiste / Dates": { $regex: designerName.replace(/[^a-zA-Z0-9\s]/g, ""), $options: "i" } },
      // Recherche en supprimant les caractères spéciaux dans "designer"
      { designer: { $regex: designerName.replace(/[^a-zA-Z0-9\s]/g, ""), $options: "i" } },
      // Recherche sur le premier mot seulement dans "Artiste / Dates"
      { "Artiste / Dates": { $regex: `^${designerName.split(" ")[0]}`, $options: "i" } },
      // Recherche sur le premier mot seulement dans "designer"
      { designer: { $regex: `^${designerName.split(" ")[0]}`, $options: "i" } },
    ]

    let luminaires = []
    let searchUsed = ""

    for (let i = 0; i < searchPatterns.length; i++) {
      const pattern = searchPatterns[i]
      luminaires = await db.collection("luminaires").find(pattern).toArray()
      if (luminaires.length > 0) {
        searchUsed = `Pattern ${i + 1}`
        console.log(`✅ Trouvé avec ${searchUsed}: ${luminaires.length} luminaires`)
        break
      }
    }

    console.log(`📊 ${luminaires.length} luminaires trouvés pour "${designerName}"`)

    if (luminaires.length === 0) {
      // Essayer une recherche encore plus large avec $or
      const broadSearch = await db
        .collection("luminaires")
        .find({
          $or: [
            { "Artiste / Dates": { $regex: designerName.split(" ")[0], $options: "i" } },
            { designer: { $regex: designerName.split(" ")[0], $options: "i" } },
          ],
        })
        .toArray()

      console.log(`🔍 Recherche large: ${broadSearch.length} résultats`)

      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
          debug: {
            searchTerm: designerName,
            broadResults: broadSearch.length,
            suggestions: broadSearch.slice(0, 5).map((l) => l["Artiste / Dates"] || l["designer"]),
          },
        },
        { status: 404 },
      )
    }

    // Chercher l'image du designer dans la collection designers avec recherche flexible
    let designerImage = null
    let imagedesigner = null

    try {
      const designerQueries = [
        { Nom: designerName },
        { Nom: { $regex: `^${designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { Nom: { $regex: designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { Nom: { $regex: designerName.split(" ")[0], $options: "i" } },
      ]

      for (const query of designerQueries) {
        const designerDoc = await db.collection("designers").findOne(query)
        if (designerDoc && designerDoc.imagedesigner) {
          designerImage = `/api/images/filename/${designerDoc.imagedesigner}`
          imagedesigner = designerDoc.imagedesigner
          console.log(`✅ Image designer trouvée: ${designerDoc.imagedesigner}`)
          break
        }
      }
    } catch (error) {
      console.log("⚠️ Pas d'image trouvée pour ce designer")
    }

    // Créer l'objet designer
    const designer = {
      nom: designerName,
      count: luminaires.length,
      image: designerImage,
      imagedesigner: imagedesigner, // Ajouter le nom du fichier pour la page de détail
      biographie: "",
      specialites: [],
    }

    // Adapter les luminaires pour l'affichage
    const adaptedLuminaires = luminaires.map((lum: any) => ({
      ...lum,
      id: lum._id,
      image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
      filename: lum["Nom du fichier"], // Ajouter le nom du fichier
      name: lum["Nom luminaire"] || "Sans nom",
      year: lum["Année"] || "",
    }))

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires: adaptedLuminaires,
      },
      debug: {
        searchUsed,
        originalName: designerName,
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
