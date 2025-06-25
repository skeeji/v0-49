// Fichier : app/api/images/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { GridFSFile } from "mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const bucket = await getBucket();
    
    if (!ObjectId.isValid(params.fileId)) {
      return NextResponse.json({ error: "ID de fichier invalide" }, { status: 400 });
    }
    
    const fileId = new ObjectId(params.fileId);

    // D'abord, trouvons les métadonnées du fichier pour obtenir le contentType
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
    }
    const fileInfo: GridFSFile = files[0];

    // Ensuite, on ouvre le flux de téléchargement
    const downloadStream = bucket.openDownloadStream(fileId);
    
    // On retourne le flux avec les bons headers
    return new NextResponse(downloadStream as any, {
      status: 200,
      headers: {
        // AMÉLIORATION : Utilisation du contentType dynamique
        'Content-Type': fileInfo.contentType || 'application/octet-stream',
        'Content-Length': fileInfo.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error("Impossible de récupérer l'image:", error);
    // Masquer les détails de l'erreur en production pour la sécurité
    const errorMessage = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: "Impossible de traiter la demande", details: errorMessage }, { status: 500 });
  }
}
