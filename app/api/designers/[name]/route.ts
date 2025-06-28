import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

// Fonction pour créer un slug à partir d'un nom
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerParam = decodeURIComponent(params.name)
    console.log("🔍 Recherche designer:", designerParam)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les luminaires
    const luminaires = await db.collection("luminaires").find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés`)

    // Chercher le designer par plusieurs méthodes
    let designerLuminaires: any[] = []
    let designerInfo: any = null

    // Méthode 1: Recherche exacte par nom complet
    designerLuminaires = luminaires.filter((lum) => lum.designer === designerParam)

    // Méthode 2: Recherche par nom nettoyé
    if (designerLuminaires.length === 0) {
      const cleanParam = getDesignerNameOnly(designerParam)
      designerLuminaires = luminaires.filter((lum) => {
        const cleanDesigner = getDesignerNameOnly(lum.designer || "")
        return cleanDesigner.toLowerCase() === cleanParam.toLowerCase()
      })
    }

    // Méthode 3: Recherche par slug
    if (designerLuminaires.length === 0) {
      const slugParam = createSlug(designerParam)
      designerLuminaires = luminaires.filter((lum) => {
        const designerSlug = createSlug(getDesignerNameOnly(lum.designer || ""))
        return designerSlug === slugParam
      })
    }

    // Méthode 4: Recherche partielle
    if (designerLuminaires.length === 0) {
      designerLuminaires = luminaires.filter((lum) => {
        const designer = lum.designer || ""
        return designer.toLowerCase().includes(designerParam.toLowerCase())
      })
    }

    console.log(`🎯 ${designerLuminaires.length} luminaires trouvés pour le designer`)

    if (designerLuminaires.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
        },
        { status: 404 },
      )
    }

    // Récupérer les infos du designer depuis la collection designers
    const designerName = getDesignerNameOnly(designerLuminaires[0].designer)
    const designerData = await db.collection("designers").findOne({
      $or: [
        { nom: designerName },
        { nom: designerParam },
        { slug: createSlug(designerName) },
        { slug: createSlug(designerParam) },
      ],
    })

    if (designerData) {
      designerInfo = {
        ...designerData,
        _id: designerData._id.toString(),
      }
    }

    // Transformer les luminaires
    const transformedLuminaires = designerLuminaires.map((luminaire) => ({
      ...luminaire,
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),
      name: luminaire.nom,
      artist: luminaire.designer,
      year: luminaire.annee,
      image: luminaire["Nom du fichier"] ? `/api/images/filename/${luminaire["Nom du fichier"]}` : null,
      filename: luminaire["Nom du fichier"] || "",
    }))

    return NextResponse.json({
      success: true,
      designer: {
        name: designerName,
        fullName: designerLuminaires[0].designer,
        slug: createSlug(designerName),
        count: designerLuminaires.length,
        info: designerInfo,
      },
      luminaires: transformedLuminaires,
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
