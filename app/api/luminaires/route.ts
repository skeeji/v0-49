import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    console.log(`📊 API /api/luminaires GET - limit: ${limit}, skip: ${skip}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = await collection.find({}).limit(limit).skip(skip).toArray()

    console.log(`✅ ${luminaires.length} luminaires récupérés`)

    const formattedLuminaires = luminaires.map((luminaire) => {
      // Gérer les matériaux
      let materials = ""
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materials = luminaire.materiaux.join(", ")
      } else if (luminaire.Matériaux) {
        if (typeof luminaire.Matériaux === "string" && luminaire.Matériaux.trim() !== "") {
          materials = luminaire.Matériaux.trim()
        } else if (Array.isArray(luminaire.Matériaux)) {
          materials = luminaire.Matériaux.join(", ")
        }
      }

      return {
        _id: luminaire._id.toString(),
        nom: luminaire.nom || luminaire["Nom luminaire"] || "",
        designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
        annee: luminaire.annee || luminaire["Année"] || "",
        periode: luminaire.periode || luminaire["Spécialité"] || "",
        categorie: luminaire.categorie || luminaire["Catégorie"] || "",
        editeur: luminaire.editeur || luminaire["Editeur"] || "",
        collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
        description: luminaire.description || luminaire["Description"] || "",
        signe: luminaire.signe || luminaire["Signé"] || "",
        dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
        materiaux: materials,
        estimation: luminaire.estimation || luminaire["Estimation"] || "",
        filename: luminaire.filename || luminaire["Nom du fichier"] || "",
        lienSiteMarchand: luminaire.lienSiteMarchand || luminaire["Lien site marchand"] || "",
        etiquette: luminaire.etiquette || luminaire["Etiquette"] || "",
        bibliographie: luminaire.bibliographie || luminaire["Bibliographie"] || "",
        createdAt: luminaire.createdAt,
        updatedAt: luminaire.updatedAt,
      }
    })

    return NextResponse.json({
      success: true,
      luminaires: formattedLuminaires,
      count: formattedLuminaires.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires GET:", error)
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
    const data = await request.json()
    console.log("📝 API /api/luminaires POST - Données reçues:", data)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // S'assurer que les matériaux sont un tableau
    let materiauxArray = []
    if (Array.isArray(data.materiaux)) {
      materiauxArray = data.materiaux
    } else if (typeof data.materiaux === "string" && data.materiaux.trim() !== "") {
      materiauxArray = data.materiaux
        .split(",")
        .map((m: string) => m.trim())
        .filter((m: string) => m.length > 0)
    }

    // Créer le document avec TOUS les champs (normalisés ET CSV)
    const luminaireData = {
      // Champs normalisés
      nom: data.nom || "",
      designer: data.designer || "",
      annee: data.annee || "",
      periode: data.periode || "",
      categorie: data.categorie || "",
      editeur: data.editeur || "",
      collaboration: data.collaboration || "",
      description: data.description || "",
      signe: data.signe || "",
      dimensions: data.dimensions || "",
      materiaux: materiauxArray,
      estimation: data.estimation || "",
      lienSiteMarchand: data.lienSiteMarchand || "",
      etiquette: data.etiquette || "",
      bibliographie: data.bibliographie || "",
      filename: data.filename || "",

      // Champs CSV originaux pour compatibilité export
      "Nom luminaire": data.nom || data["Nom luminaire"] || "",
      "Artiste / Dates": data.designer || data["Artiste / Dates"] || "",
      Année: data.annee || data["Année"] || "",
      Spécialité: data.periode || data["Spécialité"] || "",
      Catégorie: data.categorie || data["Catégorie"] || "",
      Editeur: data.editeur || data["Editeur"] || "",
      "Collaboration / Œuvre": data.collaboration || data["Collaboration / Œuvre"] || "",
      Description: data.description || data["Description"] || "",
      Signé: data.signe || data["Signé"] || "",
      Dimensions: data.dimensions || data["Dimensions"] || "",
      Matériaux: materiauxArray.join(", "),
      Estimation: data.estimation || data["Estimation"] || "",
      "Nom du fichier": data.filename || data["Nom du fichier"] || "",
      "Lien site marchand": data.lienSiteMarchand || data["Lien site marchand"] || "",
      Etiquette: data.etiquette || data["Etiquette"] || "",
      Bibliographie: data.bibliographie || data["Bibliographie"] || "",

      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("💾 Document à insérer:", luminaireData)

    const result = await collection.insertOne(luminaireData)

    console.log("✅ Luminaire créé avec succès, ID:", result.insertedId)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: result.insertedId.toString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires POST:", error)
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
