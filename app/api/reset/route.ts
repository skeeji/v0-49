import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST() {
  try {
    console.log("🔄 Début du reset de la base de données...")
    const client = await clientPromise
    const db = client.db(DBNAME)

    // 1. Sauvegarder les favoris de tous les utilisateurs avec les détails des luminaires
    console.log("💾 Sauvegarde des favoris utilisateurs...")
    const usersCollection = db.collection("users")
    const luminairesCollection = db.collection("luminaires")

    const users = await usersCollection.find({}).toArray()
    const favoritesBackup: Map<string, Array<{ nom: string; designer: string; periode: string }>> = new Map()

    for (const user of users) {
      if (user.favorites && user.favorites.length > 0) {
        const favoriteDetails = []

        for (const favoriteId of user.favorites) {
          try {
            const luminaire = await luminairesCollection.findOne({ _id: favoriteId })
            if (luminaire) {
              favoriteDetails.push({
                nom: luminaire.nom || luminaire["Nom luminaire"] || "",
                designer:
                  luminaire.designer || luminaire["Artiste / Dates"] || luminaire["Designer (Artiste / Dates)"] || "",
                periode: luminaire.periode || luminaire["Spécialité"] || luminaire.Spécialité || "",
              })
            }
          } catch (err) {
            console.warn(`⚠️ Impossible de récupérer le luminaire ${favoriteId}`)
          }
        }

        if (favoriteDetails.length > 0) {
          favoritesBackup.set(user.email, favoriteDetails)
          console.log(`📋 ${favoriteDetails.length} favoris sauvegardés pour ${user.email}`)
        }
      }
    }

    // 2. Supprimer les collections (sauf users pour préserver les comptes)
    console.log("🗑️ Suppression des collections...")
    const collections = await db.listCollections().toArray()

    for (const collection of collections) {
      const collectionName = collection.name

      // Ne pas supprimer la collection users
      if (collectionName === "users") {
        console.log(`⏭️ Collection "${collectionName}" préservée`)
        continue
      }

      // Ne pas supprimer les collections système
      if (collectionName.startsWith("system.")) {
        continue
      }

      try {
        await db.collection(collectionName).drop()
        console.log(`✅ Collection "${collectionName}" supprimée`)
      } catch (error: any) {
        if (error.codeName === "NamespaceNotFound") {
          console.log(`⏭️ Collection "${collectionName}" n'existe pas`)
        } else {
          console.error(`❌ Erreur lors de la suppression de "${collectionName}":`, error)
        }
      }
    }

    // 3. Recréer les collections nécessaires
    console.log("📝 Recréation des collections...")
    await db.createCollection("luminaires")
    await db.createCollection("designers")
    await db.createCollection("timeline_descriptions")
    await db.createCollection("period_images")

    // 4. Créer les index
    console.log("🔍 Création des index...")
    await db.collection("luminaires").createIndex({ nom: 1 })
    await db.collection("luminaires").createIndex({ designer: 1 })
    await db.collection("luminaires").createIndex({ periode: 1 })
    await db.collection("designers").createIndex({ nom: 1 })

    // 5. Restaurer les favoris avec les nouveaux IDs
    console.log("🔄 Restauration des favoris...")

    for (const [userEmail, favoriteDetails] of favoritesBackup.entries()) {
      const newFavoriteIds = []

      for (const detail of favoriteDetails) {
        try {
          // Rechercher le luminaire par ses propriétés
          const luminaire = await luminairesCollection.findOne({
            $or: [
              { nom: detail.nom, designer: detail.designer },
              { "Nom luminaire": detail.nom, "Artiste / Dates": detail.designer },
              { nom: detail.nom, periode: detail.periode },
              { "Nom luminaire": detail.nom, Spécialité: detail.periode },
            ],
          })

          if (luminaire && luminaire._id) {
            newFavoriteIds.push(luminaire._id)
          } else {
            console.warn(`⚠️ Luminaire non trouvé après reset: ${detail.nom}`)
          }
        } catch (err) {
          console.warn(`⚠️ Erreur lors de la recherche du luminaire ${detail.nom}`)
        }
      }

      if (newFavoriteIds.length > 0) {
        await usersCollection.updateOne({ email: userEmail }, { $set: { favorites: newFavoriteIds } })
        console.log(`✅ ${newFavoriteIds.length} favoris restaurés pour ${userEmail}`)
      } else {
        // Vider les favoris si aucun luminaire n'a été retrouvé
        await usersCollection.updateOne({ email: userEmail }, { $set: { favorites: [] } })
        console.log(`⚠️ Aucun favori restauré pour ${userEmail}`)
      }
    }

    console.log("✅ Reset terminé avec succès et favoris préservés!")

    return NextResponse.json({
      success: true,
      message: "Base de données réinitialisée avec succès. Les favoris ont été préservés.",
      favoritesRestored: favoritesBackup.size,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors du reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du reset de la base de données",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
