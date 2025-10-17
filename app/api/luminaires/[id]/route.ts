import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 API /api/luminaires/[id] - Récupération luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire trouvé:", luminaire._id)
    console.log("🔍 Clés disponibles:", Object.keys(luminaire))
    console.log("🔍 Valeur materiaux:", luminaire.materiaux)
    console.log("🔍 Valeur Matériaux:", luminaire.Matériaux)

    // CORRECTION: Gestion unifiée des matériaux pour l'affichage
    let materiauxForDisplay = ""
    if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
      materiauxForDisplay = luminaire.materiaux.join(", ")
      console.log("✅ Matériaux trouvés dans 'materiaux' (array):", materiauxForDisplay)
    } else if (luminaire.Matériaux && typeof luminaire.Matériaux === "string" && luminaire.Matériaux.trim() !== "") {
      materiauxForDisplay = luminaire.Matériaux.trim()
      console.log("✅ Matériaux trouvés dans 'Matériaux' (string):", materiauxForDisplay)
    }

    const formattedLuminaire = {
      _id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",
      description: luminaire.description || "",
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
      estimation: luminaire.estimation || luminaire["Estimation"] || "",
      editeur: luminaire.editeur || luminaire["Editeur"] || "",
      materiaux: luminaire.materiaux || [],
      Matériaux: materiauxForDisplay,
      categorie: luminaire.categorie || luminaire["Catégorie"] || "",
      lienSiteMarchand: luminaire.lienSiteMarchand || luminaire["Lien site marchand"] || "",
      etiquette: luminaire.etiquette || luminaire["Etiquette"] || "",
      bibliographie: luminaire.bibliographie || luminaire["Bibliographie"] || "",
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",
      image: luminaire.images?.[0]
        ? `/api/images/filename/${luminaire.images[0]}`
        : luminaire.filename
          ? `/api/images/filename/${luminaire.filename}`
          : null,
      designerImageFilename: luminaire.designerImageFilename || "",
      images: luminaire.images || [],
      couleurs: luminaire.couleurs || [],
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
      "Nom luminaire": luminaire["Nom luminaire"] || "",
      "Artiste / Dates": luminaire["Artiste / Dates"] || "",
      Année: luminaire["Année"] || "",
      Spécialité: luminaire["Spécialité"] || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || "",
      Signé: luminaire["Signé"] || "",
      "Nom du fichier": luminaire["Nom du fichier"] || "",
      Dimensions: luminaire["Dimensions"] || "",
      Estimation: luminaire["Estimation"] || "",
      Catégorie: luminaire["Catégorie"] || "",
      Editeur: luminaire["Editeur"] || luminaire.editeur || "",
      "Lien site marchand": luminaire["Lien site marchand"] || "",
      Etiquette: luminaire["Etiquette"] || "",
      Bibliographie: luminaire["Bibliographie"] || "",
    }

    console.log("✅ Matériaux formatés pour affichage:", materiauxForDisplay)

    return NextResponse.json({
      success: true,
      data: formattedLuminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("📝 API /api/luminaires/[id] PUT - Mise à jour luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const updates = await request.json()
    console.log("📊 Mises à jour reçues:", updates)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire mis à jour avec succès")

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires/[id] PUT:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ API /api/luminaires/[id] DELETE - Suppression luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire supprimé avec succès")

    return NextResponse.json({
      success: true,
      message: "Luminaire supprimé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires/[id] DELETE:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
