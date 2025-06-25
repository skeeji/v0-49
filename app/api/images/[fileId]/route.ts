// app/api/images/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("ID de fichier invalide.", { status: 400 });
    }
    
    const bucket = await getBucket();
    const objectId = new ObjectId(id);

    const file = await bucket.find({ _id: objectId }).next();
    if (!file) {
      return new NextResponse("Fichier non trouvé.", { status: 404 });
    }

    const downloadStream = bucket.openDownloadStream(objectId);
    
    // On retourne la réponse avec le contenu du fichier et les bons en-têtes
    return new Response(downloadStream as any, {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable", // Cache pour 1 an
      },
    });

  } catch (error) {
    console.error(`Erreur pour récupérer l'image ${params.id} de GridFS:`, error);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}
