// Fichier : lib/gridfs.ts
import { GridFSBucket } from "mongodb";
import clientPromise from "./mongodb";

const DBNAME = "gersaint";
const BUCKET_NAME = "media";

let bucket: GridFSBucket;

export const getBucket = async (): Promise<GridFSBucket> => {
  if (bucket) {
    return bucket;
  }
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    return bucket;
  } catch (error) {
    console.error("❌ Erreur initialisation GridFS:", error);
    throw new Error("Impossible d'initialiser le stockage GridFS.");
  }
};
