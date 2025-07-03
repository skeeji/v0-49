import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID de luminaire invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = await collection.findOne({ _id: new ObjectId(id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    // --- LE FORMATEUR DE DONNÉES ESSENTIEL ---
    const formattedLuminaire = {
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",

      // Champs qui posaient problème, maintenant corrigés
      description: luminaire.description || "",
      dimensions: luminaire.dimensions || "",
      estimation: luminaire.estimation || "",
      editeur: luminaire.editeur || "",

      materiaux: luminaire.materiaux || [],

      // Chemins des images
      images: luminaire.images || [], // Renvoie la liste des noms de fichiers
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
      designerImage: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : null,

      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
    }

    return NextResponse.json({ success: true, data: formattedLuminaire })
  } catch (error: any) {
    console.error(`❌ Erreur API /api/luminaires/${params.id}:`, error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const data = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID de luminaire invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Luminaire mis à jour avec succès" })
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour luminaire ${params.id}:`, error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
