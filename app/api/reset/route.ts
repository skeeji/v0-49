import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API DELETE /api/reset appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = await getBucket()

    console.log("🗑️ Suppression des collections MongoDB...")
    await db.collection("luminaires").deleteMany({})
    await db.collection("designers").deleteMany({})
    await db.collection("timelineDescriptions").deleteMany({})
    await db.collection("welcomeVideos").deleteMany({})

    console.log("🗑️ Suppression des fichiers GridFS...")
    // Récupérer tous les fichiers dans le bucket
    const files = await bucket.find({}).toArray()

    // Supprimer chaque fichier individuellement
    for (const file of files) {
      await bucket.delete(file._id)
      console.log(`✅ Fichier GridFS supprimé: ${file.filename}`)
    }

    console.log("✅ Réinitialisation terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans DELETE /api/reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la réinitialisation du serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
