import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ Début de la réinitialisation complète du serveur...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections MongoDB
    const collections = await db.listCollections().toArray()
    console.log(`📋 Collections trouvées: ${collections.map((c) => c.name).join(", ")}`)

    for (const collection of collections) {
      const result = await db.collection(collection.name).deleteMany({})
      console.log(`🗑️ Collection ${collection.name}: ${result.deletedCount} documents supprimés`)
    }

    // Supprimer tous les fichiers GridFS
    try {
      const bucket = await getBucket()
      const files = await bucket.find({}).toArray()
      console.log(`📁 Fichiers GridFS trouvés: ${files.length}`)

      for (const file of files) {
        await bucket.delete(file._id)
        console.log(`🗑️ Fichier GridFS supprimé: ${file.filename}`)
      }
    } catch (gridfsError) {
      console.warn("⚠️ Erreur GridFS (peut-être vide):", gridfsError)
    }

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      details: {
        collections: collections.length,
        files: "Tous les fichiers GridFS supprimés",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de la réinitialisation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la réinitialisation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
