// lib/gridfs.ts

import { GridFSBucket } from "mongodb";
import clientPromise from "./mongodb";

let bucket: GridFSBucket;

// Fonction pour initialiser et/ou récupérer l'instance du bucket GridFS
export const getBucket = async () => {
  if (bucket) {
    return bucket;
  }

  try {
    const client = await clientPromise;
    const db = client.db("gersaint"); // Assurez-vous que le nom de la base est correct
    // Le nom du bucket est 'images'. MongoDB créera les collections 'images.files' et 'images.chunks'.
    bucket = new GridFSBucket(db, { bucketName: "images" }); 
    console.log("GridFS Bucket 'images' initialisé.");
    return bucket;
  } catch (error) {
    console.error("Erreur lors de l'initialisation de GridFS Bucket:", error);
    throw new Error("Impossible d'initialiser le stockage de fichiers GridFS.");
  }
};
