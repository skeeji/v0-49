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

  const db = client.db(); 

  // On utilise un nom générique car on y stocke images ET vidéos. 'media' est un bon choix.
  bucket = new GridFSBucket(db, { bucketName: 'media' });

  return bucket;
}
