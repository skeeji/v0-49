// Fichier : lib/gridfs.ts
import { GridFSBucket } from "mongodb";
import clientPromise from "./mongodb";

const DBNAME = "gersaint"; // Centralisons le nom de la base de données
const BUCKET_NAME = "media"; // Un nom unique pour notre bucket de fichiers

let bucket: GridFSBucket;

// Fonction pour initialiser et/ou récupérer l'instance du bucket GridFS
export const getBucket = async (): Promise<GridFSBucket> => {
  if (bucket) {
    return bucket;
  }

  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    console.log(`✅ GridFS Bucket '${BUCKET_NAME}' initialisé.`);
    return bucket;
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de GridFS Bucket:", error);
    throw new Error("Impossible d'initialiser le stockage de fichiers GridFS.");
  }
};
