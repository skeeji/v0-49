// Fichier : lib/gridfs.ts
import clientPromise from "./mongodb";
import { GridFSBucket } from "mongodb";

let bucket: GridFSBucket;

// Cette fonction prépare et retourne le "seau" de stockage
export async function getBucket() {
  if (bucket) {
    return bucket;
  }

  const client = await clientPromise;
  
  // Important : client.db() utilise la base de données définie dans votre MONGODB_URI
  const db = client.db(); 
  
  bucket = new GridFSBucket(db, { bucketName: 'images' });
  return bucket;
}
