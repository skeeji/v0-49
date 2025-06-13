import { MongoClient, type Db } from "mongodb"
import { env } from "./env"

let client: MongoClient
let db: Db

export async function connectToDatabase() {
  try {
    if (!client) {
      console.log("🔌 Connecting to MongoDB...")
      client = new MongoClient(env.MONGODB_URI)
      await client.connect()
      console.log("✅ Connected to MongoDB")
    }

    if (!db) {
      db = client.db(env.MONGO_INITDB_DATABASE)

      // Créer les index nécessaires
      await createIndexes()
    }

    return { client, db }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    throw error
  }
}

async function createIndexes() {
  try {
    // Index pour les luminaires
    await db.collection("luminaires").createIndex({ nom: "text", description: "text" })
    await db.collection("luminaires").createIndex({ designer: 1 })
    await db.collection("luminaires").createIndex({ annee: 1 })
    await db.collection("luminaires").createIndex({ createdAt: -1 })

    // Index pour les designers
    await db.collection("designers").createIndex({ nom: 1 }, { unique: true })
    await db.collection("designers").createIndex({ slug: 1 }, { unique: true })

    console.log("📊 MongoDB indexes created")
  } catch (error) {
    console.warn("⚠️ Index creation warning:", error)
  }
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close()
    console.log("🔌 MongoDB connection closed")
  }
}

// Fonction utilitaire pour obtenir la DB
export async function getDatabase() {
  const { db } = await connectToDatabase()
  return db
}
