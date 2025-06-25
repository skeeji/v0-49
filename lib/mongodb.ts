import { MongoClient } from "mongodb"

// Assure-toi que la variable d'environnement est définie.
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// En environnement de développement, on utilise une variable globale pour que la
// connexion ne soit pas recréée à chaque rechargement à chaud (HMR).
if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // En production, il n'est pas nécessaire d'utiliser une variable globale.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Exporte une promesse de client MongoDB. En l'exportant de cette manière,
// le client sera partagé sur n'importe quelle fonction qui importe ce module.
export default clientPromise
