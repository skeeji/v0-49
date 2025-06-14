import { NextResponse } from "next/server";
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";

// Récupérer le nom de la base de données depuis les variables d'environnement
const DBNAME = process.env.MONGO_INITDB_DATABASE;

if (!DBNAME) {
  throw new Error('Variable d\'environnement manquante ou invalide: "MONGO_INITDB_DATABASE"');
}

// Fonction pour gérer les requêtes GET et servir une image
export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    
    // S'assurer que le nom du bucket est le même que celui utilisé pour l'upload
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Vérifier si l'ID est un ObjectId MongoDB valide
    if (!ObjectId.isValid(params.fileId)) {
        return new NextResponse("ID de fichier invalide", { status: 400 });
    }

    const fileId = new ObjectId(params.fileId);

    // Trouver les métadonnées du fichier pour obtenir le type de contenu (Content-Type)
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
        return new NextResponse("Fichier non trouvé", { status: 404 });
    }
    const file = files[0];
    
    // Ouvrir un flux de téléchargement depuis GridFS
    const downloadStream = bucket.openDownloadStream(fileId);
    
    // Transformer le flux Node.js en flux web pour la réponse
    const webStream = Readable.toWeb(downloadStream) as ReadableStream<Uint8Array>;

    // Renvoyer le flux de l'image avec les bons en-têtes
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
      },
    });

  } catch (error) {
    console.error(`Erreur API [GET /api/images/${params.fileId}]:`, error);
    return new NextResponse("Erreur serveur ou fichier non trouvé", { status: 500 });
  }
}
