import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST() {
  try {
    console.log("🗑️ Début du reset de la base de données...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // 1. Sauvegarder les favoris de tous les utilisateurs
    console.log("💾 Sauvegarde des favoris...")
    const usersCollection = db.collection("users")
    const users = await usersCollection.find({}).toArray()

    const allFavorites: Array<{
      userId: string
      luminaireProps: {
        nom: string
        designer: string
        filename: string
        periode: string
      }
    }> = []

    for (const user of users) {
      if (user.favorites && Array.isArray(user.favorites) && user.favorites.length > 0) {
        const luminairesCollection = db.collection("luminaires")

        for (const favId of user.favorites) {
          const luminaire = await luminairesCollection.findOne({ _id: favId })
          if (luminaire) {
            allFavorites.push({
              userId: user.uid,
              luminaireProps: {
                nom: luminaire.nom || luminaire["Nom luminaire"] || "",
                designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
                filename:
                  luminaire.filename ||
                  luminaire["Nom du fichier"] ||
                  luminaire["Image luminaire (Nom du fichier)"] ||
                  "",
                periode: luminaire.periode || luminaire["Spécialité"] || "",
              },
            })
          }
        }
      }
    }

    console.log(`💾 ${allFavorites.length} favoris sauvegardés pour ${users.length} utilisateurs`)

    // 2. Supprimer les collections
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    for (const collectionName of collectionNames) {
      // NE PAS supprimer la collection users
      if (collectionName !== "users") {
        await db.collection(collectionName).drop()
        console.log(`✅ Collection "${collectionName}" supprimée`)
      }
    }

    // 3. Supprimer les fichiers GridFS
    try {
      const bucket = await getBucket()
      const files = await bucket.find({}).toArray()

      for (const file of files) {
        await bucket.delete(file._id)
      }

      console.log(`✅ ${files.length} fichiers GridFS supprimés`)
    } catch (error) {
      console.log("⚠️ Erreur lors de la suppression des fichiers GridFS:", error)
    }

    // 4. Vider les favoris de tous les utilisateurs (temporairement)
    await usersCollection.updateMany({}, { $set: { favorites: [] } })
    console.log("✅ Favoris des utilisateurs vidés temporairement")

    // 5. Recréer les collections nécessaires
    await db.createCollection("luminaires")
    await db.createCollection("designers")
    await db.createCollection("timeline_descriptions")
    await db.createCollection("period_images")

    console.log("✅ Collections recréées")

    // 6. Note: Les favoris seront restaurés automatiquement après le réimport des luminaires
    // via un script séparé ou manuellement

    return NextResponse.json({
      success: true,
      message: `Base de données vidée avec succès. ${allFavorites.length} favoris sauvegardés et seront restaurés après réimport.`,
      favoritesBackup: allFavorites,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors du reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
