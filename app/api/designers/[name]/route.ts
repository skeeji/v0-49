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

    /* ANCIENNE LOGIQUE (N+1 — jusqu'à 10 find() séquentiels + 1 broad search) :
    let luminaires = []
    let searchUsed = ""
    for (let i = 0; i < searchPatterns.length; i++) {
      luminaires = await db.collection("luminaires").find(searchPatterns[i]).toArray()
      if (luminaires.length > 0) { searchUsed = `Pattern ${i + 1}`; break }
    }
    if (luminaires.length === 0) {
      const broadSearch = await db.collection("luminaires").find({ $or: [firstWord regex x2] }).toArray()
      return 404 avec broadSearch.length et suggestions
    }
    */

    // NOUVELLE LOGIQUE : 1-2 requêtes $or consolidées, fallback sur la boucle séquentielle si erreur
    let luminaires: any[] = []
    let searchUsed = ""
    let broadResults: any[] = [] // conservé pour le debug de la réponse 404

    try {
      const escaped = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const stripped = designerName.replace(/[^a-zA-Z0-9\s]/g, "")
      const firstWord = designerName.split(" ")[0]

      // Requête 1 : correspondances exactes + insensibles à la casse (haute précision)
      const preciseResults = await db.collection("luminaires").find({
        $or: [
          { "Artiste / Dates": designerName },
          { designer: designerName },
          { "Artiste / Dates": { $regex: `^${escaped}$`, $options: "i" } },
          { designer: { $regex: `^${escaped}$`, $options: "i" } },
        ],
      }).toArray()

      if (preciseResults.length > 0) {
        luminaires = preciseResults
        searchUsed = "Batch-précis (Pattern 1-4)"
        console.log(`✅ Trouvé avec ${searchUsed}: ${luminaires.length} luminaires`)
      } else {
        // Requête 2 : correspondances partielles + premier mot (patterns 5-10 + broad search original)
        broadResults = await db.collection("luminaires").find({
          $or: [
            { "Artiste / Dates": { $regex: escaped, $options: "i" } },
            { designer: { $regex: escaped, $options: "i" } },
            { "Artiste / Dates": { $regex: stripped, $options: "i" } },
            { designer: { $regex: stripped, $options: "i" } },
            { "Artiste / Dates": { $regex: `^${firstWord}`, $options: "i" } },
            { designer: { $regex: `^${firstWord}`, $options: "i" } },
          ],
        }).toArray()

        if (broadResults.length > 0) {
          luminaires = broadResults
          searchUsed = "Batch-large (Pattern 5-10)"
          console.log(`✅ Trouvé avec ${searchUsed}: ${luminaires.length} luminaires`)
        }
      }
    } catch (batchError: any) {
      // Fallback : ancienne logique séquentielle
      console.warn("⚠️ Batch search échoué, fallback séquentiel:", batchError.message)
      for (let i = 0; i < searchPatterns.length; i++) {
        luminaires = await db.collection("luminaires").find(searchPatterns[i]).toArray()
        if (luminaires.length > 0) {
          searchUsed = `Pattern ${i + 1} (fallback)`
          console.log(`✅ Trouvé avec ${searchUsed}: ${luminaires.length} luminaires`)
          break
        }
      }
    }

    console.log(`📊 ${luminaires.length} luminaires trouvés pour "${designerName}"`)

    if (luminaires.length === 0) {
      console.log(`🔍 Recherche large: ${broadResults.length} résultats`)

      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
          debug: {
            searchTerm: designerName,
            broadResults: broadResults.length,
            suggestions: broadResults.slice(0, 5).map((l: any) => l["Artiste / Dates"] || l["designer"]),
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

      /* ANCIENNE LOGIQUE (N+1 — jusqu'à 4 findOne séquentiels sur designers) :
      for (const query of designerQueries) {
        const designerDoc = await db.collection("designers").findOne(query)
        if (designerDoc && designerDoc.imagedesigner) {
          designerImage = `/api/images/filename/${designerDoc.imagedesigner}`
          imagedesigner = designerDoc.imagedesigner
          break
        }
      }
      */

      // NOUVELLE LOGIQUE : une seule requête $or, fallback sur la boucle séquentielle si erreur
      try {
        const designerDoc = await db.collection("designers").findOne({ $or: designerQueries })
        if (designerDoc?.imagedesigner) {
          designerImage = `/api/images/filename/${designerDoc.imagedesigner}`
          imagedesigner = designerDoc.imagedesigner
          console.log(`✅ Image designer trouvée: ${designerDoc.imagedesigner}`)
        }
      } catch (orError: any) {
        console.warn("⚠️ Batch designer image search échoué, fallback séquentiel:", orError.message)
        for (const query of designerQueries) {
          const designerDoc = await db.collection("designers").findOne(query)
          if (designerDoc?.imagedesigner) {
            designerImage = `/api/images/filename/${designerDoc.imagedesigner}`
            imagedesigner = designerDoc.imagedesigner
            console.log(`✅ Image designer trouvée (fallback): ${designerDoc.imagedesigner}`)
            break
          }
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
    const adaptedLuminaires = luminaires.map((lum: any) => {
      // Correction du bug d'affichage des images de luminaires
      const imageFilename = lum.filename || lum["Nom du fichier"]

      return {
        ...lum,
        id: lum._id,
        image: imageFilename ? `/api/images/filename/${imageFilename}` : null,
        filename: imageFilename, // Utiliser le nom de fichier trouvé
        name: lum["Nom luminaire"] || "Sans nom",
        year: lum["Année"] || "",
      }
    })

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
