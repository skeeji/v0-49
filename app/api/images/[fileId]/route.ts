// Fichier : app/api/images/[fileId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs"; // On utilise la même fonction
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const bucket = await getBucket();
    const fileId = new ObjectId(params.fileId);
    
    const downloadStream = bucket.openDownloadStream(fileId);

    // Stream la réponse directement au navigateur
    return new NextResponse(downloadStream as any, {
      headers: {
        'Content-Type': 'image/jpeg', // Ajustez si vous avez d'autres types
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error("Impossible de récupérer l'image:", error);
    return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
  }
}
