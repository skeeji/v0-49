import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log("🔍 API /api/luminaires/[id] GET - ID:", id)

    if (!ObjectId.isValid(id)) {
      console.log("❌ ID invalide:", id)
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const luminairesCollection = db.collection("luminaires")
    const designersCollection = db.collection("designers")

    const luminaire = await luminairesCollection.findOne({ _id: new ObjectId(id) })

    if (!luminaire) {
      console.log("❌ Luminaire non trouvé:", id)
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    let imageUrl = null

    if (luminaire.imageId) {
      imageUrl = `/api/images/${luminaire.imageId}`
      console.log(`✅ Image luminaire trouvée par ID: ${imageUrl}`)
    } else if (luminaire.filename || luminaire["Nom du fichier"] || luminaire["Image luminaire (Nom du fichier)"]) {
      const filename =
        luminaire.filename || luminaire["Nom du fichier"] || luminaire["Image luminaire (Nom du fichier)"]
      imageUrl = `/api/images/filename/${filename}`
      console.log(`✅ Image luminaire trouvée par filename: ${imageUrl}`)
    }

    let designerImageFilename = null
    const designerName = luminaire.designer || luminaire["Artiste / Dates"] || luminaire["Artiste, ca année"] || null

    if (designerName) {
      console.log(`[v0] Searching for designer: ${designerName}`)

      // Chercher le designer dans la collection designers
      const designerDoc = await designersCollection.findOne({
        $or: [{ nom: designerName }, { Nom: designerName }, { nom: { $regex: `^${designerName}`, $options: "i" } }],
      })

      if (designerDoc && designerDoc.imagedesigner) {
        designerImageFilename = designerDoc.imagedesigner
        console.log(`✅ Image designer trouvée: ${designerImageFilename}`)
      } else {
        console.log(`⚠️ Aucune image designer trouvée pour: ${designerName}`)
      }
    }

    console.log("✅ Luminaire trouvé:", luminaire.nom || luminaire["Nom luminaire"])

    return NextResponse.json({
      success: true,
      data: {
        ...luminaire,
        _id: luminaire._id.toString(),
        image: imageUrl,
        designerImageFilename: designerImageFilename, // Ajouter l'image du designer
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires/[id]:", error)
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    console.log("📝 Mise à jour luminaire:", id, body)

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire mis à jour:", id)

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans PUT /api/luminaires/[id]:", error)
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log("🗑️ Suppression luminaire:", id)

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire supprimé:", id)

    return NextResponse.json({
      success: true,
      message: "Luminaire supprimé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans DELETE /api/luminaires/[id]:", error)
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
