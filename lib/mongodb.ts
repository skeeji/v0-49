import { MongoClient, type Db } from "mongodb"
import { env } from "./env"

let client: MongoClient
let db: Db

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db }
  }

  try {
    client = new MongoClient(env.MONGODB_URI)
    await client.connect()

    // Extraire le nom de la base de données de l'URI
    const dbName = env.MONGODB_URI.split("/").pop()?.split("?")[0] || "luminaires"
    db = client.db(dbName)

    console.log(`✅ Connecté à MongoDB: ${dbName}`)
    return { client, db }
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error)
    throw error
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close()
    console.log("🔌 Connexion MongoDB fermée")
  }
}
