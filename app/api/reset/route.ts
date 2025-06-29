import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      luminaires: 0,
      designers: 0,
      gridfsFiles: 0,
      gridfsChunks: 0,
    }

    // 1. Supprimer toutes les collections de données
    try {
      const luminairesResult = await db.collection("luminaires").deleteMany({})
      results.luminaires = luminairesResult.deletedCount
      console.log(`🗑️ ${results.luminaires} luminaires supprimés`)
    } catch (error) {
      console.log("⚠️ Collection luminaires vide ou inexistante")
    }

    try {
      const designersResult = await db.collection("designers").deleteMany({})
      results.designers = designersResult.deletedCount
      console.log(`🗑️ ${results.designers} designers supprimés`)
    } catch (error) {
      console.log("⚠️ Collection designers vide ou inexistante")
    }

    // 2. Supprimer TOUS les fichiers GridFS (images, vidéos, logos)
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })

      // Lister tous les fichiers
      const files = await bucket.find({}).toArray()
      console.log(`🗑️ ${files.length} fichiers GridFS trouvés`)

      // Supprimer chaque fichier individuellement
      for (const file of files) {
        try {
          await bucket.delete(file._id)
          results.gridfsFiles++
        } catch (deleteError) {
          console.log(`⚠️ Erreur suppression fichier ${file.filename}:`, deleteError)
        }
      }

      console.log(`🗑️ ${results.gridfsFiles} fichiers GridFS supprimés`)
    } catch (error) {
      console.log("⚠️ Erreur GridFS:", error)
    }

    // 3. Nettoyer manuellement les collections GridFS
    try {
      const filesResult = await db.collection("uploads.files").deleteMany({})
      const chunksResult = await db.collection("uploads.chunks").deleteMany({})
      results.gridfsChunks = chunksResult.deletedCount
      console.log(
        `🗑️ Collections GridFS nettoyées: ${filesResult.deletedCount} files, ${chunksResult.deletedCount} chunks`,
      )
    } catch (error) {
      console.log("⚠️ Collections GridFS déjà vides")
    }

    // 4. Vérification finale
    const remainingLuminaires = await db.collection("luminaires").countDocuments()
    const remainingDesigners = await db.collection("designers").countDocuments()
    const remainingFiles = await db.collection("uploads.files").countDocuments()
    const remainingChunks = await db.collection("uploads.chunks").countDocuments()

    console.log("✅ Vérification finale:")
    console.log(`   - Luminaires restants: ${remainingLuminaires}`)
    console.log(`   - Designers restants: ${remainingDesigners}`)
    console.log(`   - Fichiers GridFS restants: ${remainingFiles}`)
    console.log(`   - Chunks GridFS restants: ${remainingChunks}`)

    const isCompletelyClean =
      remainingLuminaires === 0 && remainingDesigners === 0 && remainingFiles === 0 && remainingChunks === 0

    return NextResponse.json({
      success: true,
      message: isCompletelyClean
        ? "✅ Réinitialisation complète terminée - TOUTES les données et fichiers ont été supprimés"
        : "⚠️ Réinitialisation terminée avec quelques résidus",
      deleted: results,
      verification: {
        remainingLuminaires,
        remainingDesigners,
        remainingFiles,
        remainingChunks,
        isCompletelyClean,
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

export async function DELETE(request: NextRequest) {
  return POST(request)
}
