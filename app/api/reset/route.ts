import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getGridFSBucket } from "@/lib/gridfs"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Début du reset de la base de données...")

    const { db } = await connectToDatabase()

    // ÉTAPE 1: Sauvegarder les favoris avant le reset
    console.log("💾 Sauvegarde des favoris...")
    const usersCollection = db.collection("users")
    const users = await usersCollection.find({}).toArray()

    const favoritesMappings: { [userId: string]: Array<{ nom: string; designer: string; periode: string }> } = {}

    for (const user of users) {
      if (user.favorites && Array.isArray(user.favorites) && user.favorites.length > 0) {
        console.log(`📌 Utilisateur ${user.email} a ${user.favorites.length} favoris`)

        const luminairesCollection = db.collection("luminaires")
        const favoriteLuminaires = []

        for (const favoriteId of user.favorites) {
          try {
            const luminaire = await luminairesCollection.findOne({ _id: favoriteId })
            if (luminaire) {
              favoriteLuminaires.push({
                nom: luminaire.nom || luminaire["Nom luminaire"] || "",
                designer:
                  luminaire.designer || luminaire["Artiste / Dates"] || luminaire["Designer (Artiste / Dates)"] || "",
                periode: luminaire.periode || luminaire["Spécialité"] || luminaire.Spécialité || "",
              })
            }
          } catch (error) {
            console.log(`⚠️ Impossible de récupérer le luminaire ${favoriteId}`)
          }
        }

        if (favoriteLuminaires.length > 0) {
          favoritesMappings[user._id.toString()] = favoriteLuminaires
          console.log(`✅ Sauvegardé ${favoriteLuminaires.length} favoris pour ${user.email}`)
        }
      }
    }

    // ÉTAPE 2: Supprimer toutes les collections SAUF users
    const collections = await db.listCollections().toArray()
    for (const collection of collections) {
      if (collection.name !== "users") {
        await db.collection(collection.name).drop()
        console.log(`✅ Collection ${collection.name} supprimée`)
      }
    }

    // ÉTAPE 3: Supprimer tous les fichiers GridFS
    try {
      const bucket = getGridFSBucket()
      const files = await bucket.find({}).toArray()
      for (const file of files) {
        await bucket.delete(file._id)
      }
      console.log(`✅ ${files.length} fichiers GridFS supprimés`)
    } catch (error) {
      console.log("⚠️ Erreur lors de la suppression des fichiers GridFS:", error)
    }

    // ÉTAPE 4: Restaurer les favoris après le reset
    console.log("🔄 Restauration des favoris...")
    for (const [userId, favorites] of Object.entries(favoritesMappings)) {
      const luminairesCollection = db.collection("luminaires")
      const newFavorites = []

      for (const favorite of favorites) {
        // Rechercher le luminaire par ses propriétés
        const luminaire = await luminairesCollection.findOne({
          $or: [
            { nom: favorite.nom, designer: favorite.designer },
            { "Nom luminaire": favorite.nom, "Artiste / Dates": favorite.designer },
            {
              nom: favorite.nom,
              $or: [{ periode: favorite.periode }, { Spécialité: favorite.periode }],
            },
          ],
        })

        if (luminaire) {
          newFavorites.push(luminaire._id)
          console.log(`✅ Luminaire "${favorite.nom}" retrouvé avec nouvel ID`)
        } else {
          console.log(`⚠️ Luminaire "${favorite.nom}" non trouvé après reset`)
        }
      }

      if (newFavorites.length > 0) {
        await usersCollection.updateOne({ _id: userId }, { $set: { favorites: newFavorites } })
        console.log(`✅ ${newFavorites.length} favoris restaurés pour l'utilisateur`)
      }
    }

    console.log("✅ Reset terminé avec succès")

    return NextResponse.json({
      success: true,
      message: "Base de données réinitialisée avec succès (favoris préservés)",
      favoritesRestored: Object.keys(favoritesMappings).length,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors du reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors du reset de la base de données",
      },
      { status: 500 },
    )
  }
}
